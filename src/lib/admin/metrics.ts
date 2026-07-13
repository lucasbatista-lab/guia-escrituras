import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import { getPlanByKey } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DailyReportAggregates } from "@/lib/reports";
import { AppError } from "@/lib/safety";
import {
  resolveEffectiveSubscription,
  selectEffectiveSubscriptionsByUser,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";

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

export interface AdminOverviewMetrics {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  subscribersByPlan: Array<{ planKey: PlanKey; count: number }>;
  activeSubscriberUsers: number;
  mrrBrlCents: number;
  usersWithDuplicateSubscriptions: number;
  pendingCheckouts: number;
  paymentFailures: number;
  aiRequests: number;
  aiCostBrlCents: number;
  aiCostUsdMicros: number;
  aiErrors: number;
  referralsAttributed: number;
  referralsFirstPayment: number;
  referralsSecondPayment: number;
  referralsRewardPending: number;
}

export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  const client = admin();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    profiles,
    profiles7,
    profiles30,
    subscriptions,
    intents,
    pastDue,
    failedEvents,
    usage,
    referrals,
  ] = await Promise.all([
    client.from("profiles").select("id", { count: "exact", head: true }),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d7),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d30),
    client
      .from("subscriptions")
      .select(
        "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
      )
      .in("status", ["active", "trialing"]),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .eq("status", "checkout_created"),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "failed"),
    client.from("usage_events").select("estimated_cost_brl_cents, estimated_cost_usd_micros, success"),
    client.from("referral_attributions").select("status"),
  ]);

  const candidates: SubscriptionCandidate[] = (subscriptions.data ?? []).map(
    (row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      planKey: row.plan_key as PlanKey,
      status: row.status as string,
      stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
      stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
      currentPeriodEnd: (row.current_period_end as string | null) ?? null,
      createdAt: row.created_at as string,
    }),
  );

  const { effective, usersWithDuplicates } =
    selectEffectiveSubscriptionsByUser(candidates);

  const planCounts = new Map<PlanKey, number>();
  let mrr = 0;
  for (const row of effective) {
    planCounts.set(row.planKey, (planCounts.get(row.planKey) ?? 0) + 1);
    mrr += getPlanByKey(row.planKey)?.priceMonthlyCents ?? 0;
  }

  const subscribersByPlan = (["essencial", "caminho", "profundo", "particular"] as PlanKey[]).map(
    (planKey) => ({ planKey, count: planCounts.get(planKey) ?? 0 }),
  );

  let aiCostBrl = 0;
  let aiCostUsd = 0;
  let aiErrors = 0;
  for (const row of usage.data ?? []) {
    aiCostBrl += row.estimated_cost_brl_cents ?? 0;
    aiCostUsd += Number(row.estimated_cost_usd_micros ?? 0);
    if (!row.success) aiErrors += 1;
  }

  const refStatuses = referrals.data ?? [];
  return {
    totalUsers: profiles.count ?? 0,
    newUsers7d: profiles7.count ?? 0,
    newUsers30d: profiles30.count ?? 0,
    subscribersByPlan,
    activeSubscriberUsers: effective.length,
    mrrBrlCents: mrr,
    usersWithDuplicateSubscriptions: usersWithDuplicates,
    pendingCheckouts: intents.count ?? 0,
    paymentFailures: (pastDue.count ?? 0) + (failedEvents.count ?? 0),
    aiRequests: usage.data?.length ?? 0,
    aiCostBrlCents: aiCostBrl,
    aiCostUsdMicros: aiCostUsd,
    aiErrors,
    referralsAttributed: refStatuses.filter((r) => r.status === "attributed").length,
    referralsFirstPayment: refStatuses.filter(
      (r) => r.status === "first_payment_confirmed",
    ).length,
    referralsSecondPayment: refStatuses.filter(
      (r) => r.status === "second_payment_confirmed",
    ).length,
    referralsRewardPending: refStatuses.filter((r) => r.status === "reward_pending")
      .length,
  };
}

export interface AdminUserRow {
  userIdMask: string;
  createdAt: string;
  planKey: string | null;
  subscriptionStatus: string | null;
}

export async function getAdminUsers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AdminUserRow[]; total: number }> {
  const client = admin();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: profiles, count, error } = await client
    .from("profiles")
    .select("id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new AppError("admin_query_failed", "admin_query_failed", 500);

  const ids = (profiles ?? []).map((p) => p.id);
  const { data: subs } = ids.length
    ? await client
        .from("subscriptions")
        .select(
          "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
        )
        .in("user_id", ids)
        .in("status", ["active", "trialing", "past_due"])
    : { data: [] as Array<Record<string, unknown>> };

  const byUser = new Map<string, SubscriptionCandidate[]>();
  for (const row of subs ?? []) {
    const candidate: SubscriptionCandidate = {
      id: row.id as string,
      userId: row.user_id as string,
      planKey: row.plan_key as PlanKey,
      status: row.status as string,
      stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
      stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
      currentPeriodEnd: (row.current_period_end as string | null) ?? null,
      createdAt: row.created_at as string,
    };
    const list = byUser.get(candidate.userId) ?? [];
    list.push(candidate);
    byUser.set(candidate.userId, list);
  }

  return {
    total: count ?? 0,
    rows: (profiles ?? []).map((p) => {
      const resolved = resolveEffectiveSubscription(byUser.get(p.id) ?? []);
      return {
        userIdMask: maskUserId(p.id),
        createdAt: p.created_at,
        planKey: resolved?.subscription.planKey ?? null,
        subscriptionStatus: resolved?.subscription.status ?? null,
      };
    }),
  };
}

export interface AdminUsageMetrics {
  totalRequests: number;
  usagePercentiles: { p50: number; p90: number; p99: number };
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
  const client = admin();
  const { data: monthly } = await client
    .from("usage_monthly")
    .select("request_count")
    .order("request_count", { ascending: true });

  const counts = (monthly ?? []).map((r) => r.request_count ?? 0).sort((a, b) => a - b);
  const total = counts.reduce((s, n) => s + n, 0);

  return {
    totalRequests: total,
    usagePercentiles: {
      p50: percentile(counts, 50),
      p90: percentile(counts, 90),
      p99: percentile(counts, 99),
    },
  };
}

export interface AdminPartnerRow {
  code: string;
  attributions: number;
  firstPayments: number;
  secondPayments: number;
  rewardPending: number;
}

export async function getAdminPartnerMetrics(): Promise<{
  rows: AdminPartnerRow[];
  totalRewardPending: number;
}> {
  const client = admin();
  const { data: codes } = await client
    .from("referral_codes")
    .select("code")
    .eq("active", true);

  const { data: attributions } = await client
    .from("referral_attributions")
    .select("referral_code, status");

  const rows: AdminPartnerRow[] = (codes ?? []).map((c) => {
    const mine = (attributions ?? []).filter((a) => a.referral_code === c.code);
    return {
      code: c.code,
      attributions: mine.length,
      firstPayments: mine.filter((m) => m.status === "first_payment_confirmed").length,
      secondPayments: mine.filter((m) => m.status === "second_payment_confirmed")
        .length,
      rewardPending: mine.filter((m) => m.status === "reward_pending").length,
    };
  });

  return {
    rows,
    totalRewardPending: rows.reduce((s, r) => s + r.rewardPending, 0),
  };
}

export interface StoredDailyReport {
  reportDate: string;
  aggregates: DailyReportAggregates;
}

export async function getStoredDailyReports(
  limit = 10,
): Promise<StoredDailyReport[]> {
  const client = admin();
  const { data } = await client
    .from("daily_reports")
    .select("report_date, aggregates")
    .order("report_date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    reportDate: row.report_date as string,
    aggregates: row.aggregates as DailyReportAggregates,
  }));
}

export function formatRevenueBrl(cents: number | null | undefined): string {
  if (cents == null) return "Ainda não integrada";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
