import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import { getPlanByKey } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/safety";
import {
  resolveEffectiveSubscription,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";
import { getBudgetConfig } from "@/lib/usage";
import { currentYearMonth } from "@/lib/utils";
import { getTraditionPolicy } from "@/lib/theology";
import { AdminMetricsError, maskUserId } from "./metrics";
import {
  ADMIN_QUERY_MAX_PAGES,
  ADMIN_QUERY_PAGE_SIZE,
  collectColumnPaginated,
  fetchAllRowsPaginated,
  intersectIdSets,
  paginateSortedIds,
} from "./paginate";
import { assertAdminServiceAccess } from "./require-admin";
import { logger } from "@/lib/logging/logger";
import {
  buildUserSubscriptionViews,
  matchesAdminUserFilters,
  type AdminUserFilterMatchInput,
} from "./user-filter-index";
import {
  ADMIN_USER_CSV_MAX_ROWS,
  type AdminUserListFilters,
} from "./user-list-params";
import { maskStripeId } from "./labels";

export type { AdminUserListFilters } from "./user-list-params";

function admin() {
  try {
    return createAdminClient();
  } catch {
    throw new AdminMetricsError(
      "Métricas indisponíveis: configure SUPABASE_SECRET_KEY.",
    );
  }
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

async function lookupAuthUser(
  userId: string,
): Promise<{ email: string | null; displayName: string | null }> {
  const client = admin();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return { email: null, displayName: null };
  }
  const meta = data.user.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    (typeof meta?.display_name === "string" && meta.display_name) ||
    (typeof meta?.full_name === "string" && meta.full_name) ||
    null;
  return { email: data.user.email ?? null, displayName };
}

async function findUserIdsByEmail(query: string): Promise<string[]> {
  const client = admin();
  const needle = query.trim().toLowerCase();
  const ids: string[] = [];
  const perPage = 200;
  const maxPages = ADMIN_QUERY_MAX_PAGES;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) break;
    const users = data.users ?? [];
    for (const user of users) {
      if (user.email?.toLowerCase().includes(needle)) {
        ids.push(user.id);
      }
    }
    if (users.length < perPage) break;
  }
  return ids;
}

export interface AdminUserRow {
  userId: string;
  userIdMask: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  onboardingCompleted: boolean | null;
  planKey: string | null;
  subscriptionStatus: string | null;
  monthlyUsedBrlCents: number | null;
  lastActivityAt: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  hasDuplicateSubscriptions: boolean;
  isPastDue: boolean;
}

async function findUserIdsCancelingWithAccess(): Promise<string[]> {
  try {
    const { getStripeClient } = await import("@/lib/stripe/client");
    const { assertStripeConfigured } = await import("@/lib/stripe/config");
    assertStripeConfigured();
    const stripe = getStripeClient();
    const customerIds = new Set<string>();
    for (const status of ["active", "trialing"] as const) {
      let startingAfter: string | undefined;
      for (let page = 0; page < ADMIN_QUERY_MAX_PAGES; page += 1) {
        const list = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after: startingAfter,
        });
        for (const sub of list.data) {
          if (!sub.cancel_at_period_end) continue;
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (customerId) customerIds.add(customerId);
        }
        if (!list.has_more || list.data.length === 0) break;
        startingAfter = list.data[list.data.length - 1]?.id;
      }
    }
    if (customerIds.size === 0) return [];
    const client = admin();
    const { values } = await collectColumnPaginated<{ user_id: string }, string>(
      (from, to) =>
        client
          .from("billing_customers")
          .select("user_id")
          .in("stripe_customer_id", [...customerIds])
          .range(from, to),
      (row) => row.user_id as string,
    );
    return [...new Set(values)];
  } catch {
    return [];
  }
}

async function fetchLiveAndPastDueCandidates(): Promise<{
  live: SubscriptionCandidate[];
  pastDueUserIds: Set<string>;
}> {
  const client = admin();
  const [livePage, pastDuePage] = await Promise.all([
    fetchAllRowsPaginated<Record<string, unknown>>(
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
    ),
    fetchAllRowsPaginated<{ user_id: string }>(
      (from, to) =>
        client
          .from("subscriptions")
          .select("user_id")
          .eq("status", "past_due")
          .order("user_id", { ascending: true })
          .range(from, to),
      { pageSize: ADMIN_QUERY_PAGE_SIZE, maxPages: ADMIN_QUERY_MAX_PAGES },
    ),
  ]);

  return {
    live: livePage.rows.map((row) => mapSubRow(row)),
    pastDueUserIds: new Set(pastDuePage.rows.map((r) => r.user_id as string)),
  };
}

async function fetchOnboardingByUser(): Promise<Map<string, boolean>> {
  const client = admin();
  const { rows } = await fetchAllRowsPaginated<{
    user_id: string;
    onboarding_completed: boolean | null;
  }>(
    (from, to) =>
      client
        .from("spiritual_profiles")
        .select("user_id, onboarding_completed")
        .order("user_id", { ascending: true })
        .range(from, to),
    { pageSize: ADMIN_QUERY_PAGE_SIZE, maxPages: ADMIN_QUERY_MAX_PAGES },
  );
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.user_id, Boolean(row.onboarding_completed));
  }
  return map;
}

async function fetchCheckoutPendingUserIds(): Promise<string[]> {
  const client = admin();
  const { values } = await collectColumnPaginated<
    { user_id: string | null },
    string
  >(
    (from, to) =>
      client
        .from("signup_intents")
        .select("user_id")
        .eq("status", "checkout_created")
        .not("user_id", "is", null)
        .order("updated_at", { ascending: false })
        .range(from, to),
    (row) => row.user_id,
  );
  return [...new Set(values)];
}

async function fetchProfileCreatedAtMap(
  userIds: string[],
): Promise<Map<string, { createdAt: string; displayName: string | null }>> {
  const client = admin();
  const map = new Map<
    string,
    { createdAt: string; displayName: string | null }
  >();
  if (userIds.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const { data, error } = await client
      .from("profiles")
      .select("id, display_name, created_at")
      .in("id", chunk);
    if (error) {
      throw new AppError("admin_query_failed", "admin_query_failed", 500);
    }
    for (const row of data ?? []) {
      map.set(row.id as string, {
        createdAt: row.created_at as string,
        displayName: (row.display_name as string | null) ?? null,
      });
    }
  }
  return map;
}

async function fetchAllProfileIdsOrdered(): Promise<
  Array<{ id: string; createdAt: string; displayName: string | null }>
> {
  const client = admin();
  const { rows } = await fetchAllRowsPaginated<{
    id: string;
    display_name: string | null;
    created_at: string;
  }>(
    (from, to) =>
      client
        .from("profiles")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    { pageSize: ADMIN_QUERY_PAGE_SIZE, maxPages: ADMIN_QUERY_MAX_PAGES },
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    displayName: r.display_name,
  }));
}

async function findUserIdsByUtmSource(utmSource: string): Promise<string[]> {
  const client = admin();
  const { values } = await collectColumnPaginated<{ user_id: string | null }, string>(
    (from, to) =>
      client
        .from("signup_intents")
        .select("user_id")
        .eq("utm_source", utmSource)
        .not("user_id", "is", null)
        .order("updated_at", { ascending: false })
        .range(from, to),
    (row) => row.user_id as string,
  );
  return [...new Set(values.filter(Boolean))];
}

async function fetchCanceledUserIds(): Promise<string[]> {
  const client = admin();
  const { values } = await collectColumnPaginated<{ user_id: string }, string>(
    (from, to) =>
      client
        .from("subscriptions")
        .select("user_id")
        .eq("status", "canceled")
        .order("user_id", { ascending: true })
        .range(from, to),
    (row) => row.user_id as string,
  );
  return [...new Set(values)];
}

function hasDerivedFilters(filters: AdminUserFilterMatchInput): boolean {
  return (
    Boolean(filters.planKey && filters.planKey !== "any") ||
    Boolean(filters.subscriptionStatus && filters.subscriptionStatus !== "any") ||
    Boolean(
      filters.onboardingCompleted && filters.onboardingCompleted !== "any",
    ) ||
    Boolean(filters.duplicatesOnly) ||
    Boolean(filters.pastDueOnly)
  );
}

function withinCreatedBounds(
  createdAt: string,
  createdFrom?: string,
  createdTo?: string,
): boolean {
  if (createdFrom && createdAt < createdFrom) return false;
  if (createdTo && createdAt > createdTo) return false;
  return true;
}

export async function getAdminUsers(
  params: AdminUserListFilters = {},
): Promise<{ rows: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  await assertAdminServiceAccess();
  const client = admin();
  const page = Math.max(1, params.page ?? 1);
  const pageSizeCap = params.forExport ? ADMIN_USER_CSV_MAX_ROWS : 50;
  const pageSize = Math.min(pageSizeCap, Math.max(1, params.pageSize ?? 25));
  const q = params.q?.trim() ?? "";
  const sortAsc = params.sort === "created_asc";
  const createdFrom = params.createdFrom;
  const createdTo = params.createdTo;
  const hasCreatedBounds = Boolean(createdFrom || createdTo);
  const wantsCanceled = params.subscriptionStatus === "canceled";

  const filterMatch: AdminUserFilterMatchInput = {
    planKey: params.planKey,
    // canceled is applied via restriction — view index has no canceled status.
    subscriptionStatus: wantsCanceled ? "any" : params.subscriptionStatus,
    onboardingCompleted: params.onboardingCompleted,
    duplicatesOnly: params.duplicatesOnly,
    pastDueOnly: params.pastDueOnly,
  };

  let restriction: Set<string> | null = null;

  if (params.cancelingOnly) {
    const cancelingIds = await findUserIdsCancelingWithAccess();
    if (cancelingIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
    restriction = intersectIdSets(restriction, cancelingIds);
  }

  if (params.checkoutPendingOnly) {
    const pendingIds = await fetchCheckoutPendingUserIds();
    if (pendingIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
    restriction = intersectIdSets(restriction, pendingIds);
  }

  if (params.utmSource) {
    const utmIds = await findUserIdsByUtmSource(params.utmSource);
    if (utmIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
    restriction = intersectIdSets(restriction, utmIds);
  }

  if (wantsCanceled) {
    const canceledIds = await fetchCanceledUserIds();
    if (canceledIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
    restriction = intersectIdSets(restriction, canceledIds);
  }

  if (q) {
    let fromQuery: string[];
    if (isUuid(q)) {
      fromQuery = [q];
    } else if (q.includes("@")) {
      fromQuery = await findUserIdsByEmail(q);
    } else {
      const { values } = await collectColumnPaginated<{ id: string }, string>(
        (from, to) =>
          client
            .from("profiles")
            .select("id")
            .ilike("display_name", `%${q}%`)
            .order("created_at", { ascending: false })
            .range(from, to),
        (row) => row.id,
      );
      fromQuery = values;
    }
    if (fromQuery.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
    restriction = intersectIdSets(restriction, fromQuery);
  }

  const derived = hasDerivedFilters(filterMatch);
  const largeRestriction = Boolean(restriction && restriction.size > 100);

  // Fast path: no derived filters and small (or empty) restriction — SQL count + page.
  if (!derived && !largeRestriction) {
    let profilesQuery = client
      .from("profiles")
      .select("id, display_name, created_at", { count: "exact" })
      .order("created_at", { ascending: sortAsc })
      .order("id", { ascending: sortAsc });

    if (createdFrom) {
      profilesQuery = profilesQuery.gte("created_at", createdFrom);
    }
    if (createdTo) {
      profilesQuery = profilesQuery.lte("created_at", createdTo);
    }

    if (restriction) {
      const ids = [...restriction];
      if (ids.length === 0) {
        return { rows: [], total: 0, page, pageSize };
      }
      profilesQuery = profilesQuery.in("id", ids);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: profiles, count, error } = await profilesQuery.range(from, to);
    if (error) {
      throw new AppError("admin_query_failed", "admin_query_failed", 500);
    }

    const pageIds = (profiles ?? []).map((p) => p.id as string);
    const rows = await enrichAdminUserRows(
      pageIds,
      new Map(
        (profiles ?? []).map((p) => [
          p.id as string,
          {
            createdAt: p.created_at as string,
            displayName: (p.display_name as string | null) ?? null,
          },
        ]),
      ),
    );

    return {
      rows,
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  // Derived filters or large restriction: index subscriptions/onboarding with
  // paginated reads, then paginate matching profile ids deterministically.
  const [{ live, pastDueUserIds }, onboardingByUser] = await Promise.all([
    fetchLiveAndPastDueCandidates(),
    fetchOnboardingByUser(),
  ]);
  const views = buildUserSubscriptionViews(live, pastDueUserIds);

  // status=none / onboarding=no need the profile catalog (users without sub rows).
  const needsCatalog =
    params.subscriptionStatus === "none" ||
    params.onboardingCompleted === "no" ||
    hasCreatedBounds ||
    (!derived && largeRestriction);

  const matched: Array<{
    id: string;
    createdAt: string;
    displayName: string | null;
  }> = [];

  if (needsCatalog) {
    const catalog = await fetchAllProfileIdsOrdered();
    for (const p of catalog) {
      if (restriction && !restriction.has(p.id)) continue;
      if (!withinCreatedBounds(p.createdAt, createdFrom, createdTo)) continue;
      if (derived) {
        const view = views.get(p.id);
        if (
          !matchesAdminUserFilters(
            view,
            onboardingByUser.get(p.id) ?? null,
            filterMatch,
          )
        ) {
          continue;
        }
      }
      matched.push({
        id: p.id,
        createdAt: p.createdAt,
        displayName: p.displayName,
      });
    }
  } else {
    // Positive subscription/onboarding filters — candidate universe from indexes.
    let candidateIds: string[];
    if (restriction) {
      candidateIds = [...restriction];
    } else if (params.onboardingCompleted === "yes") {
      candidateIds = [...onboardingByUser.entries()]
        .filter(([, done]) => done)
        .map(([id]) => id);
    } else {
      candidateIds = [...views.keys()];
    }

    const profileMeta = await fetchProfileCreatedAtMap(candidateIds);
    for (const id of candidateIds) {
      const view = views.get(id);
      if (
        derived &&
        !matchesAdminUserFilters(
          view,
          onboardingByUser.get(id) ?? null,
          filterMatch,
        )
      ) {
        continue;
      }
      const meta = profileMeta.get(id);
      if (!meta) continue;
      if (!withinCreatedBounds(meta.createdAt, createdFrom, createdTo)) continue;
      matched.push({
        id,
        createdAt: meta.createdAt,
        displayName: meta.displayName,
      });
    }
  }

  matched.sort((a, b) => {
    const t = sortAsc
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt);
    if (t !== 0) return t;
    return sortAsc ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  const { pageIds, total } = paginateSortedIds(
    matched.map((m) => m.id),
    page,
    pageSize,
  );

  const displayMap = new Map(
    matched
      .filter((m) => pageIds.includes(m.id))
      .map((m) => [
        m.id,
        { createdAt: m.createdAt, displayName: m.displayName },
      ] as const),
  );

  const rows = await enrichAdminUserRows(pageIds, displayMap, {
    views,
    onboardingByUser,
  });

  return { rows, total, page, pageSize };
}

async function enrichAdminUserRows(
  ids: string[],
  profileMeta: Map<string, { createdAt: string; displayName: string | null }>,
  preloaded?: {
    views: Map<
      string,
      {
        planKey: PlanKey | null;
        subscriptionStatus: string | null;
        hasDuplicateSubscriptions: boolean;
        isPastDue: boolean;
      }
    >;
    onboardingByUser: Map<string, boolean>;
  },
): Promise<AdminUserRow[]> {
  if (ids.length === 0) return [];
  const client = admin();
  const yearMonth = currentYearMonth();

  // List view: no Auth getUserById per row (no migration for bulk auth.users).
  // Email appears on detail; list shows profile display_name or userIdMask.
  const [
    subsResult,
    spiritualResult,
    monthlyResult,
    usageLastResult,
    intentsResult,
  ] = await Promise.all([
    preloaded
      ? Promise.resolve({ data: null as null })
      : client
          .from("subscriptions")
          .select(
            "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
          )
          .in("user_id", ids)
          .in("status", ["active", "trialing", "past_due", "canceled"]),
    preloaded
      ? Promise.resolve({ data: null as null })
      : client
          .from("spiritual_profiles")
          .select("user_id, onboarding_completed")
          .in("user_id", ids),
    client
      .from("usage_monthly")
      .select("user_id, used_brl_cents, request_count")
      .eq("year_month", yearMonth)
      .in("user_id", ids),
    client
      .from("usage_events")
      .select("user_id, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(ids.length * 3),
    client
      .from("signup_intents")
      .select("user_id, utm_source, utm_campaign, status, updated_at")
      .in("user_id", ids)
      .order("updated_at", { ascending: false }),
  ]);

  const byUser = new Map<string, SubscriptionCandidate[]>();
  if (!preloaded) {
    for (const row of subsResult.data ?? []) {
      const candidate = mapSubRow(row as Record<string, unknown>);
      const list = byUser.get(candidate.userId) ?? [];
      list.push(candidate);
      byUser.set(candidate.userId, list);
    }
  }

  const onboardingByUser =
    preloaded?.onboardingByUser ?? new Map<string, boolean>();
  if (!preloaded) {
    for (const row of spiritualResult.data ?? []) {
      onboardingByUser.set(
        row.user_id as string,
        Boolean(row.onboarding_completed),
      );
    }
  }

  const monthlyByUser = new Map<
    string,
    { usedBrlCents: number; requestCount: number }
  >();
  for (const row of monthlyResult.data ?? []) {
    monthlyByUser.set(row.user_id as string, {
      usedBrlCents: row.used_brl_cents ?? 0,
      requestCount: row.request_count ?? 0,
    });
  }

  const lastActivityByUser = new Map<string, string>();
  for (const row of usageLastResult.data ?? []) {
    const uid = row.user_id as string;
    if (!lastActivityByUser.has(uid)) {
      lastActivityByUser.set(uid, row.created_at as string);
    }
  }

  const utmByUser = new Map<
    string,
    { source: string | null; campaign: string | null }
  >();
  for (const row of intentsResult.data ?? []) {
    const uid = row.user_id as string | null;
    if (!uid || utmByUser.has(uid)) continue;
    utmByUser.set(uid, {
      source: (row.utm_source as string | null) ?? null,
      campaign: (row.utm_campaign as string | null) ?? null,
    });
  }

  return ids.map((id) => {
    const meta = profileMeta.get(id);
    const utm = utmByUser.get(id);
    const monthly = monthlyByUser.get(id);

    if (preloaded?.views) {
      const view = preloaded.views.get(id);
      return {
        userId: id,
        userIdMask: maskUserId(id),
        email: null,
        displayName: meta?.displayName ?? null,
        createdAt: meta?.createdAt ?? "",
        onboardingCompleted: onboardingByUser.has(id)
          ? (onboardingByUser.get(id) ?? null)
          : null,
        planKey: view?.planKey ?? null,
        subscriptionStatus: view?.subscriptionStatus ?? null,
        monthlyUsedBrlCents: monthly?.usedBrlCents ?? 0,
        lastActivityAt: lastActivityByUser.get(id) ?? null,
        utmSource: utm?.source ?? null,
        utmCampaign: utm?.campaign ?? null,
        hasDuplicateSubscriptions: view?.hasDuplicateSubscriptions ?? false,
        isPastDue: view?.isPastDue ?? false,
      };
    }

    const list = byUser.get(id) ?? [];
    const resolved = resolveEffectiveSubscription(
      list.filter((s) => s.status === "active" || s.status === "trialing"),
    );
    const liveCount = list.filter(
      (s) => s.status === "active" || s.status === "trialing",
    ).length;
    const pastDue = list.some((s) => s.status === "past_due");

    return {
      userId: id,
      userIdMask: maskUserId(id),
      email: null,
      displayName: meta?.displayName ?? null,
      createdAt: meta?.createdAt ?? "",
      onboardingCompleted: onboardingByUser.has(id)
        ? (onboardingByUser.get(id) ?? null)
        : null,
      planKey: resolved?.subscription.planKey ?? null,
      subscriptionStatus: pastDue
        ? "past_due"
        : (resolved?.subscription.status ?? null),
      monthlyUsedBrlCents: monthly?.usedBrlCents ?? 0,
      lastActivityAt: lastActivityByUser.get(id) ?? null,
      utmSource: utm?.source ?? null,
      utmCampaign: utm?.campaign ?? null,
      hasDuplicateSubscriptions: liveCount > 1,
      isPastDue: pastDue,
    };
  });
}

export interface AdminUserDetail {
  userId: string;
  userIdMask: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  onboardingCompleted: boolean | null;
  traditionLabel: string | null;
  planKey: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  renewsAutomatically: boolean | null;
  cancelAtPeriodEnd: boolean | null;
  /** Masked Stripe IDs for support — never full secrets. */
  stripeCustomerIdMasked: string | null;
  stripeSubscriptionIdMasked: string | null;
  cardLabel: string | null;
  monthlyUsedBrlCents: number;
  monthlyRequests: number;
  usageRequests7d: number;
  usageRequests30d: number;
  usageRequestsTotal: number;
  conversationCount: number;
  lastActivityAt: string | null;
  journeyProgress: {
    journeysStarted: number;
    journeysCompleted: number;
    stepsCompleted: number;
    lastJourneyActivityAt: string | null;
  };
  monthlyEstimatedCostNote: string;
  budgetLevel: "normal" | "elevated" | "near_limit" | "blocked" | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referralCode: string | null;
  paymentEventSummaries: Array<{
    type: string;
    processingStatus: string;
    createdAt: string;
  }>;
  flags: {
    duplicateSubscriptions: boolean;
    paymentFailed: boolean;
    checkoutPending: boolean;
    nearLimit: boolean;
    blockedByLimit: boolean;
    pastDue: boolean;
  };
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  await assertAdminServiceAccess();
  if (!isUuid(userId)) return null;
  const client = admin();

  const { data: profile } = await client
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const yearMonth = currentYearMonth();
  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  const [
    auth,
    spiritual,
    subs,
    monthly,
    intents,
    referrals,
    conversationsCount,
    usage7,
    usage30,
    usageTotal,
    lastUsage,
    journeyRows,
  ] = await Promise.all([
    lookupAuthUser(userId),
    client
      .from("spiritual_profiles")
      .select("tradition_key, onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("subscriptions")
      .select(
        "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
      )
      .eq("user_id", userId),
    client
      .from("usage_monthly")
      .select("used_brl_cents, request_count")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle(),
    client
      .from("signup_intents")
      .select(
        "utm_source, utm_medium, utm_campaign, status, checkout_created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    client
      .from("referral_attributions")
      .select("referral_code, status")
      .eq("referred_user_id", userId)
      .limit(5),
    client
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", d7),
    client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", d30),
    client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    client
      .from("usage_events")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("journey_progress")
      .select(
        "journey_slug, completed_step_ids, completed_at, updated_at, started_at",
      )
      .eq("user_id", userId),
  ]);

  const candidates = (subs.data ?? []).map((row) =>
    mapSubRow(row as Record<string, unknown>),
  );
  const live = candidates.filter(
    (s) => s.status === "active" || s.status === "trialing",
  );
  const resolved = resolveEffectiveSubscription(live);
  const pastDue = candidates.some((s) => s.status === "past_due");
  const checkoutPending = (intents.data ?? []).some(
    (i) => i.status === "checkout_created",
  );

  // payment_events has no user_id — correlate by Stripe object ids only.
  const objectIds = candidates
    .flatMap((c) => [c.stripeSubscriptionId, c.stripeCustomerId])
    .filter((v): v is string => Boolean(v?.trim()));

  let paymentEventSummaries: AdminUserDetail["paymentEventSummaries"] = [];
  let paymentFailed = pastDue;
  if (objectIds.length > 0) {
    const { data: events } = await client
      .from("payment_events")
      .select("event_type, processing_status, created_at, object_id")
      .in("object_id", objectIds)
      .order("created_at", { ascending: false })
      .limit(20);
    paymentEventSummaries = (events ?? []).map((e) => ({
      type: String(e.event_type ?? ""),
      processingStatus: String(e.processing_status ?? ""),
      createdAt: String(e.created_at ?? ""),
    }));
    paymentFailed =
      pastDue ||
      paymentEventSummaries.some((e) => e.processingStatus === "failed");
  }

  const planKey = resolved?.subscription.planKey ?? null;
  const plan = planKey ? getPlanByKey(planKey) : null;
  const used = monthly.data?.used_brl_cents ?? 0;
  const requests = monthly.data?.request_count ?? 0;

  let budgetLevel: AdminUserDetail["budgetLevel"] = null;
  if (planKey) {
    const cfg = getBudgetConfig(planKey);
    const ratio = used / Math.max(1, cfg.monthlyBudgetBrlCents);
    if (ratio >= 1) budgetLevel = "blocked";
    else if (ratio >= 0.9) budgetLevel = "near_limit";
    else if (ratio >= 0.7) budgetLevel = "elevated";
    else budgetLevel = "normal";
  }

  let renewsAutomatically: boolean | null = null;
  let cancelAtPeriodEnd: boolean | null = null;
  let cardLabel: string | null = null;

  const stripeSubId = resolved?.subscription.stripeSubscriptionId?.trim();
  if (stripeSubId) {
    try {
      const { getStripeClient } = await import("@/lib/stripe/client");
      const { assertStripeConfigured } = await import("@/lib/stripe/config");
      assertStripeConfigured();
      const stripe = getStripeClient();
      const sub = await stripe.subscriptions.retrieve(stripeSubId, {
        expand: ["default_payment_method"],
      });
      cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
      renewsAutomatically =
        (sub.status === "active" || sub.status === "trialing") &&
        !sub.cancel_at_period_end;
      const pm = sub.default_payment_method;
      if (pm && typeof pm !== "string" && pm.card?.last4) {
        const brand = pm.card.brand
          ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
          : "Cartão";
        cardLabel = `${brand} •••• ${pm.card.last4}`;
      }
    } catch (error) {
      logger.error("admin_user_stripe_lookup_failed", {
        userIdMask: maskUserId(userId),
        err: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const traditionKey = spiritual.data?.tradition_key as string | undefined;
  const traditionLabel = traditionKey
    ? (getTraditionPolicy(traditionKey)?.label ?? traditionKey)
    : null;

  const latestIntent = intents.data?.[0];
  const effectiveSub = resolved?.subscription ?? null;

  const journeys = journeyRows.data ?? [];
  const journeysStarted = journeys.filter(
    (j) => j.started_at || (j.completed_step_ids as string[] | null)?.length,
  ).length;
  const journeysCompleted = journeys.filter((j) => j.completed_at).length;
  const stepsCompleted = journeys.reduce(
    (sum, j) => sum + ((j.completed_step_ids as string[] | null)?.length ?? 0),
    0,
  );
  const lastJourneyActivityAt =
    journeys
      .map((j) => j.updated_at as string | null)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return {
    userId,
    userIdMask: maskUserId(userId),
    email: auth.email,
    displayName:
      (profile.display_name as string | null) ?? auth.displayName ?? null,
    createdAt: profile.created_at as string,
    onboardingCompleted: spiritual.data
      ? Boolean(spiritual.data.onboarding_completed)
      : null,
    traditionLabel,
    planKey,
    planName: plan?.name ?? null,
    subscriptionStatus: pastDue
      ? "past_due"
      : (resolved?.subscription.status ?? null),
    currentPeriodEnd: effectiveSub?.currentPeriodEnd ?? null,
    renewsAutomatically,
    cancelAtPeriodEnd,
    stripeCustomerIdMasked: maskStripeId(effectiveSub?.stripeCustomerId),
    stripeSubscriptionIdMasked: maskStripeId(effectiveSub?.stripeSubscriptionId),
    cardLabel,
    monthlyUsedBrlCents: used,
    monthlyRequests: requests,
    usageRequests7d: usage7.count ?? 0,
    usageRequests30d: usage30.count ?? 0,
    usageRequestsTotal: usageTotal.count ?? 0,
    conversationCount: conversationsCount.count ?? 0,
    lastActivityAt: (lastUsage.data?.created_at as string | null) ?? null,
    journeyProgress: {
      journeysStarted,
      journeysCompleted,
      stepsCompleted,
      lastJourneyActivityAt,
    },
    monthlyEstimatedCostNote:
      "Valores de uso mensal são franquia/estimativa interna — não fatura OpenAI nem receita Stripe.",
    budgetLevel,
    utmSource: (latestIntent?.utm_source as string | null) ?? null,
    utmMedium: (latestIntent?.utm_medium as string | null) ?? null,
    utmCampaign: (latestIntent?.utm_campaign as string | null) ?? null,
    referralCode: (referrals.data?.[0]?.referral_code as string | null) ?? null,
    paymentEventSummaries,
    flags: {
      duplicateSubscriptions: live.length > 1,
      paymentFailed,
      checkoutPending,
      nearLimit: budgetLevel === "near_limit",
      blockedByLimit: budgetLevel === "blocked",
      pastDue,
    },
  };
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Export filtered subscriber list as CSV (admin-only, capped, no message bodies).
 */
export async function exportAdminUsersCsv(
  params: AdminUserListFilters = {},
): Promise<{ csv: string; rowCount: number; truncated: boolean; filename: string }> {
  await assertAdminServiceAccess();
  const result = await getAdminUsers({
    ...params,
    page: 1,
    pageSize: ADMIN_USER_CSV_MAX_ROWS,
    forExport: true,
  });

  const truncated = result.total > result.rows.length;

  // Optional email enrichment for support (bounded parallel lookups).
  const emails = new Map<string, string | null>();
  const batchSize = 8;
  for (let i = 0; i < result.rows.length; i += batchSize) {
    const slice = result.rows.slice(i, i + batchSize);
    const looked = await Promise.all(
      slice.map(async (row) => {
        const auth = await lookupAuthUser(row.userId);
        return [row.userId, auth.email] as const;
      }),
    );
    for (const [id, email] of looked) emails.set(id, email);
  }

  const header = [
    "user_id",
    "user_id_mask",
    "email",
    "display_name",
    "created_at",
    "plan_key",
    "subscription_status",
    "onboarding_completed",
    "utm_source",
    "utm_campaign",
    "monthly_used_brl_cents",
    "last_activity_at",
    "has_duplicate_subscriptions",
    "is_past_due",
  ];

  const lines = [header.join(",")];
  for (const row of result.rows) {
    lines.push(
      [
        csvEscape(row.userId),
        csvEscape(row.userIdMask),
        csvEscape(emails.get(row.userId) ?? ""),
        csvEscape(row.displayName),
        csvEscape(row.createdAt),
        csvEscape(row.planKey),
        csvEscape(row.subscriptionStatus ?? "none"),
        csvEscape(
          row.onboardingCompleted == null
            ? ""
            : row.onboardingCompleted
              ? "yes"
              : "no",
        ),
        csvEscape(row.utmSource),
        csvEscape(row.utmCampaign),
        csvEscape(row.monthlyUsedBrlCents ?? 0),
        csvEscape(row.lastActivityAt),
        csvEscape(row.hasDuplicateSubscriptions ? "yes" : "no"),
        csvEscape(row.isPastDue ? "yes" : "no"),
      ].join(","),
    );
  }

  const day = new Date().toISOString().slice(0, 10);
  return {
    csv: `${lines.join("\n")}\n`,
    rowCount: result.rows.length,
    truncated,
    filename: `amemchat-usuarios-${day}.csv`,
  };
}
