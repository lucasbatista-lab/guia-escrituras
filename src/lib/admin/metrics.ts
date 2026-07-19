import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import { getPlanByKey } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DailyReportAggregates } from "@/lib/reports";
import { AppError } from "@/lib/safety";
import {
  selectEffectiveSubscriptionsByUser,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";
import { PAYMENT_EVENT_LEASE_MS } from "@/lib/stripe/payment-event-claim";
import { maskStripeId } from "./labels";
import {
  ADMIN_QUERY_MAX_PAGES,
  ADMIN_QUERY_PAGE_SIZE,
  fetchAllRowsPaginated,
} from "./paginate";
import { assertAdminServiceAccess } from "./require-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { yesterdayUtcDate } from "@/lib/reports/dates";
import { normalizeDailyReportAggregates } from "@/lib/reports/daily-report";

export class AdminMetricsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminMetricsError";
  }
}

function admin() {
  try {
    return createAdminClient();
  } catch {
    throw new AdminMetricsError(
      "Métricas indisponíveis: configure SUPABASE_SECRET_KEY.",
    );
  }
}

export function maskUserId(userId: string): string {
  return `usr_${userId.slice(0, 8)}`;
}

export function formatRevenueBrl(cents: number | null | undefined): string {
  if (cents == null) return "Ainda não integrada";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function startOfUtcDayIso(date = new Date()): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  ).toISOString();
}

function mapSubRow(row: Record<string, unknown>): SubscriptionCandidate {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    planKey: row.plan_key as PlanKey,
    status: row.status as string,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Paginated aggregate over usage_events to avoid silent PostgREST 1000-row truncation. */
export async function aggregateUsageEventsPaginated(
  client: SupabaseClient,
  options: {
    sinceIso?: string | null;
    pageSize?: number;
    maxPages?: number;
  } = {},
): Promise<{
  requests: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  costBrlCents: number;
  costUsdMicros: number;
  latencySumMs: number;
  latencySamples: number;
  partial: boolean;
  pagesRead: number;
}> {
  const pageSize = options.pageSize ?? 1000;
  const maxPages = options.maxPages ?? 50;
  let from = 0;
  let pagesRead = 0;
  let partial = false;

  let requests = 0;
  let errors = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costBrlCents = 0;
  let costUsdMicros = 0;
  let latencySumMs = 0;
  let latencySamples = 0;

  while (pagesRead < maxPages) {
    let query = client
      .from("usage_events")
      .select(
        "estimated_cost_brl_cents, estimated_cost_usd_micros, success, input_tokens, output_tokens, latency_ms",
      )
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (options.sinceIso) {
      query = query.gte("created_at", options.sinceIso);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError("admin_query_failed", "admin_query_failed", 500);
    }
    const rows = data ?? [];
    pagesRead += 1;

    for (const row of rows) {
      requests += 1;
      if (!row.success) errors += 1;
      inputTokens += Number(row.input_tokens ?? 0);
      outputTokens += Number(row.output_tokens ?? 0);
      costBrlCents += Number(row.estimated_cost_brl_cents ?? 0);
      costUsdMicros += Number(row.estimated_cost_usd_micros ?? 0);
      if (row.latency_ms != null) {
        latencySumMs += Number(row.latency_ms);
        latencySamples += 1;
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
    if (pagesRead >= maxPages) {
      partial = true;
      break;
    }
  }

  return {
    requests,
    errors,
    inputTokens,
    outputTokens,
    costBrlCents,
    costUsdMicros,
    latencySumMs,
    latencySamples,
    partial,
    pagesRead,
  };
}

export interface AdminOverviewMetrics {
  generatedAt: string;
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  activeSubscriberUsers: number;
  /** Effective live subscribers currently in trialing status. */
  trialingSubscriberUsers: number;
  /** activeSubscriberUsers / totalUsers (0..1), null when no users. */
  signupToSubscriberRate: number | null;
  /** Top utm_source among effective subscribers (from signup_intents). */
  subscribersByUtmSource: Array<{ source: string; count: number }>;
  /** Active/trialing with Stripe cancel_at_period_end (access until period end). null when Stripe lookup fails. */
  cancelingWithAccessCount: number | null;
  canceledSubscriptions: number;
  usersWithoutSubscription: number;
  subscribersByPlan: Array<{ planKey: PlanKey; count: number }>;
  /** Catalog-estimated MRR — not Stripe cash collected. */
  mrrCatalogBrlCents: number;
  mrrIsCatalogEstimate: true;
  /** Real Stripe revenue — not integrated yet. */
  realRevenueBrlCents: null;
  checkoutsStarted: number;
  checkoutsCompleted: number;
  checkoutsPending: number;
  checkoutsExpiredOrCanceled: number;
  checkoutsStuckOver30m: number;
  pastDueSubscriptions: number;
  usersWithDuplicateSubscriptions: number;
  paymentEventsReceived: number;
  /** received older than webhook lease (3 minutes) — likely stuck. */
  paymentEventsReceivedStuck: number;
  paymentEventsFailed: number;
  paymentEventsProcessed: number;
  aiRequestsToday: number;
  aiRequests30d: number;
  aiInputTokens30d: number;
  aiOutputTokens30d: number;
  /** Provider planning estimate — not OpenAI invoice. */
  aiEstimatedCostBrlCents30d: number;
  aiEstimatedCostUsdMicros30d: number;
  aiAvgLatencyMs30d: number | null;
  aiErrors30d: number;
  aiMetricsPartial: boolean;
  referralsAttributed: number;
  referralsFirstPayment: number;
  referralsSecondPayment: number;
  referralsRewardPending: number;
  /** Whether daily_reports has a row for yesterday UTC. */
  yesterdayReportPresent: boolean;
  yesterdayReportDate: string;
  /** Estimated AI cost for current UTC day (planning cents). */
  aiEstimatedCostBrlCentsToday: number;
}

async function countCancelingWithAccess(): Promise<number | null> {
  try {
    const { getStripeClient } = await import("@/lib/stripe/client");
    const { assertStripeConfigured } = await import("@/lib/stripe/config");
    assertStripeConfigured();
    const stripe = getStripeClient();
    let count = 0;
    for (const status of ["active", "trialing"] as const) {
      let startingAfter: string | undefined;
      // Page until Stripe reports no more — never invent a zero on truncation.
      for (let page = 0; page < ADMIN_QUERY_MAX_PAGES; page += 1) {
        const list = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after: startingAfter,
        });
        for (const sub of list.data) {
          if (sub.cancel_at_period_end) count += 1;
        }
        if (!list.has_more || list.data.length === 0) break;
        startingAfter = list.data[list.data.length - 1]?.id;
      }
    }
    return count;
  } catch {
    return null;
  }
}

/** Live subscription rows with PostgREST-safe pagination (no silent 1000 cut). */
export async function fetchLiveSubscriptionCandidates(
  client: SupabaseClient,
): Promise<{
  candidates: SubscriptionCandidate[];
  partial: boolean;
}> {
  const { rows, partial } = await fetchAllRowsPaginated<Record<string, unknown>>(
    (from, to) =>
      client
        .from("subscriptions")
        .select(
          "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
        )
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { pageSize: ADMIN_QUERY_PAGE_SIZE, maxPages: ADMIN_QUERY_MAX_PAGES },
  );
  return {
    candidates: rows.map((row) => mapSubRow(row)),
    partial,
  };
}

async function countReferralStatus(
  client: SupabaseClient,
  status: string,
): Promise<number> {
  const { count, error } = await client
    .from("referral_attributions")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) {
    throw new AppError("admin_query_failed", "admin_query_failed", 500);
  }
  return count ?? 0;
}

export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  await assertAdminServiceAccess();
  const client = admin();
  const now = new Date();
  const generatedAt = now.toISOString();
  const today = startOfUtcDayIso(now);
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const stuckCheckoutCutoff = new Date(
    now.getTime() - 30 * 60 * 1000,
  ).toISOString();
  const stuckEventCutoff = new Date(
    now.getTime() - PAYMENT_EVENT_LEASE_MS,
  ).toISOString();

  const [
    profiles,
    profilesToday,
    profiles7,
    profiles30,
    liveSubscriptions,
    canceledSubs,
    intentsStarted,
    intentsCompleted,
    intentsPending,
    intentsExpired,
    intentsStuck,
    pastDue,
    eventsReceived,
    eventsReceivedStuck,
    eventsFailed,
    eventsProcessed,
    referralsAttributed,
    referralsFirstPayment,
    referralsSecondPayment,
    referralsRewardPending,
    usageToday,
    usage30,
    cancelingWithAccessCount,
  ] = await Promise.all([
    client.from("profiles").select("id", { count: "exact", head: true }),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d7),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d30),
    fetchLiveSubscriptionCandidates(client),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled"),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .in("status", ["checkout_created", "completed"]),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .eq("status", "checkout_created"),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .in("status", ["expired", "canceled"]),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .eq("status", "checkout_created")
      .lt("checkout_created_at", stuckCheckoutCutoff),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "received"),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "received")
      .lt("updated_at", stuckEventCutoff),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "failed"),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "processed"),
    countReferralStatus(client, "attributed"),
    countReferralStatus(client, "first_payment_confirmed"),
    countReferralStatus(client, "second_payment_confirmed"),
    countReferralStatus(client, "reward_pending"),
    aggregateUsageEventsPaginated(client, { sinceIso: today }),
    aggregateUsageEventsPaginated(client, { sinceIso: d30 }),
    countCancelingWithAccess(),
  ]);

  const yesterdayReportDate = yesterdayUtcDate(now);
  const yesterdayReport = await client
    .from("daily_reports")
    .select("report_date")
    .eq("report_date", yesterdayReportDate)
    .maybeSingle();

  const { effective, usersWithDuplicates } = selectEffectiveSubscriptionsByUser(
    liveSubscriptions.candidates,
  );

  const trialingSubscriberUsers = effective.filter(
    (row) => row.status === "trialing",
  ).length;

  const planCounts = new Map<PlanKey, number>();
  let mrr = 0;
  for (const row of effective) {
    planCounts.set(row.planKey, (planCounts.get(row.planKey) ?? 0) + 1);
    mrr += getPlanByKey(row.planKey)?.priceMonthlyCents ?? 0;
  }

  const subscribersByPlan = (
    ["essencial", "caminho", "profundo", "particular"] as PlanKey[]
  ).map((planKey) => ({
    planKey,
    count: planCounts.get(planKey) ?? 0,
  }));

  const totalUsers = profiles.count ?? 0;
  const usersWithoutSubscription = Math.max(0, totalUsers - effective.length);
  const signupToSubscriberRate =
    totalUsers > 0 ? effective.length / totalUsers : null;

  // Origin of subscribers: latest signup_intent utm_source per effective user.
  let subscribersByUtmSource: Array<{ source: string; count: number }> = [];
  const effectiveUserIds = effective.map((e) => e.userId);
  if (effectiveUserIds.length > 0) {
    const sourceCounts = new Map<string, number>();
    // Chunk .in() to stay within URL/body limits.
    const chunkSize = 100;
    for (let i = 0; i < effectiveUserIds.length; i += chunkSize) {
      const chunk = effectiveUserIds.slice(i, i + chunkSize);
      const { data: intents } = await client
        .from("signup_intents")
        .select("user_id, utm_source, updated_at")
        .in("user_id", chunk)
        .order("updated_at", { ascending: false });
      const seen = new Set<string>();
      for (const row of intents ?? []) {
        const uid = row.user_id as string | null;
        if (!uid || seen.has(uid)) continue;
        seen.add(uid);
        const source =
          ((row.utm_source as string | null) ?? "").trim() || "(sem source)";
        sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      }
    }
    subscribersByUtmSource = [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
      .slice(0, 8);
  }

  const avgLatency =
    usage30.latencySamples > 0
      ? Math.round(usage30.latencySumMs / usage30.latencySamples)
      : null;

  return {
    generatedAt,
    totalUsers,
    newUsersToday: profilesToday.count ?? 0,
    newUsers7d: profiles7.count ?? 0,
    newUsers30d: profiles30.count ?? 0,
    activeSubscriberUsers: effective.length,
    trialingSubscriberUsers,
    signupToSubscriberRate,
    subscribersByUtmSource,
    cancelingWithAccessCount,
    canceledSubscriptions: canceledSubs.count ?? 0,
    usersWithoutSubscription,
    subscribersByPlan,
    mrrCatalogBrlCents: mrr,
    mrrIsCatalogEstimate: true,
    realRevenueBrlCents: null,
    checkoutsStarted: intentsStarted.count ?? 0,
    checkoutsCompleted: intentsCompleted.count ?? 0,
    checkoutsPending: intentsPending.count ?? 0,
    checkoutsExpiredOrCanceled: intentsExpired.count ?? 0,
    checkoutsStuckOver30m: intentsStuck.count ?? 0,
    pastDueSubscriptions: pastDue.count ?? 0,
    usersWithDuplicateSubscriptions: usersWithDuplicates,
    paymentEventsReceived: eventsReceived.count ?? 0,
    paymentEventsReceivedStuck: eventsReceivedStuck.count ?? 0,
    paymentEventsFailed: eventsFailed.count ?? 0,
    paymentEventsProcessed: eventsProcessed.count ?? 0,
    aiRequestsToday: usageToday.requests,
    aiRequests30d: usage30.requests,
    aiInputTokens30d: usage30.inputTokens,
    aiOutputTokens30d: usage30.outputTokens,
    aiEstimatedCostBrlCents30d: usage30.costBrlCents,
    aiEstimatedCostUsdMicros30d: usage30.costUsdMicros,
    aiAvgLatencyMs30d: avgLatency,
    aiErrors30d: usage30.errors,
    aiMetricsPartial: usageToday.partial || usage30.partial,
    referralsAttributed,
    referralsFirstPayment,
    referralsSecondPayment,
    referralsRewardPending,
    yesterdayReportPresent: Boolean(yesterdayReport.data?.report_date),
    yesterdayReportDate,
    aiEstimatedCostBrlCentsToday: usageToday.costBrlCents,
  };
}

export interface StoredDailyReport {
  reportDate: string;
  aggregates: DailyReportAggregates;
}

export async function getStoredDailyReports(
  limit = 10,
): Promise<StoredDailyReport[]> {
  await assertAdminServiceAccess();
  const client = admin();
  const { data } = await client
    .from("daily_reports")
    .select("report_date, aggregates")
    .order("report_date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    reportDate: row.report_date as string,
    aggregates: normalizeDailyReportAggregates({
      date: row.report_date as string,
      ...(row.aggregates as object),
    } as Parameters<typeof normalizeDailyReportAggregates>[0]),
  }));
}

export interface AdminUsageMetrics {
  totalRequests: number;
  usagePercentiles: { p50: number; p90: number; p99: number };
  partial: boolean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

export async function getAdminUsageMetrics(): Promise<AdminUsageMetrics> {
  await assertAdminServiceAccess();
  const client = admin();
  const pageSize = 1000;
  const maxPages = 50;
  let from = 0;
  let pages = 0;
  let partial = false;
  const counts: number[] = [];

  while (pages < maxPages) {
    const { data, error } = await client
      .from("usage_monthly")
      .select("request_count")
      .order("request_count", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new AppError("admin_query_failed", "admin_query_failed", 500);
    const rows = data ?? [];
    pages += 1;
    for (const r of rows) counts.push(r.request_count ?? 0);
    if (rows.length < pageSize) break;
    from += pageSize;
    if (pages >= maxPages) partial = true;
  }

  counts.sort((a, b) => a - b);
  return {
    totalRequests: counts.reduce((s, n) => s + n, 0),
    usagePercentiles: {
      p50: percentile(counts, 50),
      p90: percentile(counts, 90),
      p99: percentile(counts, 99),
    },
    partial,
  };
}

export interface AdminPartnerRow {
  code: string;
  attributions: number;
  firstPayments: number;
  secondPayments: number;
  rewardPending: number;
}

export type AdminPaymentEventFilter =
  | "any"
  | "failed"
  | "received"
  | "received_stuck"
  | "processed";

export interface AdminPaymentEventRow {
  id: string;
  eventType: string;
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
  objectIdMasked: string | null;
}

export async function getAdminPaymentEvents(options: {
  filter?: AdminPaymentEventFilter;
  limit?: number;
} = {}): Promise<AdminPaymentEventRow[]> {
  await assertAdminServiceAccess();
  const client = admin();
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const filter = options.filter ?? "any";
  const stuckCutoff = new Date(Date.now() - PAYMENT_EVENT_LEASE_MS).toISOString();

  let query = client
    .from("payment_events")
    .select("id, event_type, processing_status, created_at, updated_at, object_id")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (filter === "failed") {
    query = query.eq("processing_status", "failed");
  } else if (filter === "received") {
    query = query.eq("processing_status", "received");
  } else if (filter === "received_stuck") {
    query = query
      .eq("processing_status", "received")
      .lt("updated_at", stuckCutoff);
  } else if (filter === "processed") {
    query = query.eq("processing_status", "processed");
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError("admin_query_failed", "admin_query_failed", 500);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    eventType: String(row.event_type ?? ""),
    processingStatus: String(row.processing_status ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    objectIdMasked: maskStripeId(
      typeof row.object_id === "string" ? row.object_id : null,
    ),
  }));
}

export async function getAdminPartnerMetrics(): Promise<{
  rows: AdminPartnerRow[];
  totalRewardPending: number;
  partial: boolean;
}> {
  await assertAdminServiceAccess();
  const client = admin();
  const { data: codes } = await client
    .from("referral_codes")
    .select("code")
    .eq("active", true);

  const pageSize = 1000;
  const maxPages = 50;
  let from = 0;
  let pages = 0;
  let partial = false;
  const attributions: Array<{ referral_code: string; status: string }> = [];

  while (pages < maxPages) {
    const { data, error } = await client
      .from("referral_attributions")
      .select("referral_code, status")
      .range(from, from + pageSize - 1);
    if (error) throw new AppError("admin_query_failed", "admin_query_failed", 500);
    const rows = data ?? [];
    pages += 1;
    attributions.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
    if (pages >= maxPages) partial = true;
  }

  const rows: AdminPartnerRow[] = (codes ?? []).map((c) => {
    const mine = attributions.filter((a) => a.referral_code === c.code);
    return {
      code: c.code,
      attributions: mine.length,
      firstPayments: mine.filter((m) => m.status === "first_payment_confirmed")
        .length,
      secondPayments: mine.filter(
        (m) => m.status === "second_payment_confirmed",
      ).length,
      rewardPending: mine.filter((m) => m.status === "reward_pending").length,
    };
  });

  return {
    rows,
    totalRewardPending: rows.reduce((s, r) => s + r.rewardPending, 0),
    partial,
  };
}
