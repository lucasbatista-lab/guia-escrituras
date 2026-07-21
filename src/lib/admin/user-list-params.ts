/**
 * Normalize and bound admin user-list query params (shared by page + CSV export).
 */

import type { PlanKey } from "@/lib/entitlements";

export interface AdminUserListFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  planKey?: PlanKey | "any";
  subscriptionStatus?: string;
  onboardingCompleted?: "any" | "yes" | "no";
  duplicatesOnly?: boolean;
  pastDueOnly?: boolean;
  /** Active/trialing with cancel_at_period_end via Stripe. */
  cancelingOnly?: boolean;
  /** Users with signup_intent still in checkout_created. */
  checkoutPendingOnly?: boolean;
  /** Exact utm_source from signup_intents (normalized). */
  utmSource?: string;
  /** Exact utm_medium from signup_intents (normalized). */
  utmMedium?: string;
  /** Exact utm_content from signup_intents (normalized). */
  utmContent?: string;
  /** Inclusive ISO bounds on profiles.created_at. */
  createdFrom?: string;
  createdTo?: string;
  sort?: "created_desc" | "created_asc";
  /** Internal: raise pageSize cap for CSV export only. */
  forExport?: boolean;
}

const PLAN_KEYS = new Set<PlanKey>([
  "essencial",
  "caminho",
  "profundo",
  "particular",
]);

const STATUS_KEYS = new Set([
  "any",
  "active",
  "trialing",
  "past_due",
  "canceled",
  "none",
]);

export const ADMIN_USER_PAGE_SIZES = [25, 50] as const;
export const ADMIN_USER_CSV_MAX_ROWS = 500;
export const ADMIN_USER_Q_MAX_LENGTH = 120;
export const ADMIN_USER_UTM_MAX_LENGTH = 64;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Accept YYYY-MM-DD only; returns start-of-day UTC ISO or undefined. */
export function parseAdminDateParam(
  raw: string | undefined,
  bound: "start" | "end",
): string | undefined {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  if (bound === "start") {
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
}

export function parseAdminUserListSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminUserListFilters {
  const one = (key: string): string | undefined => {
    const v = params[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const planRaw = one("plan") ?? "any";
  const planKey = PLAN_KEYS.has(planRaw as PlanKey)
    ? (planRaw as PlanKey)
    : "any";

  const statusRaw = one("status") ?? "any";
  const subscriptionStatus = STATUS_KEYS.has(statusRaw) ? statusRaw : "any";

  const onboardingRaw = one("onboarding") ?? "any";
  const onboardingCompleted =
    onboardingRaw === "yes" || onboardingRaw === "no" ? onboardingRaw : "any";

  const sortRaw = one("sort") ?? "created_desc";
  const sort = sortRaw === "created_asc" ? "created_asc" : "created_desc";

  const pageSizeRaw = parsePositiveInt(one("pageSize"), 25);
  const pageSize = ADMIN_USER_PAGE_SIZES.includes(
    pageSizeRaw as (typeof ADMIN_USER_PAGE_SIZES)[number],
  )
    ? pageSizeRaw
    : 25;

  let q = (one("q") ?? "").trim();
  if (q.length > ADMIN_USER_Q_MAX_LENGTH) {
    q = q.slice(0, ADMIN_USER_Q_MAX_LENGTH);
  }

  let utmSource = (one("utm") ?? "").trim().toLowerCase();
  if (utmSource === "any" || utmSource === "") {
    utmSource = "";
  } else if (utmSource.length > ADMIN_USER_UTM_MAX_LENGTH) {
    utmSource = utmSource.slice(0, ADMIN_USER_UTM_MAX_LENGTH);
  }
  // Reject characters that would break PostgREST filters oddly.
  if (utmSource && !/^[a-z0-9_./+-]+$/i.test(utmSource)) {
    utmSource = "";
  }

  const normalizeUtm = (raw: string | undefined): string => {
    let value = (raw ?? "").trim().toLowerCase();
    if (value === "any" || value === "") return "";
    if (value.length > ADMIN_USER_UTM_MAX_LENGTH) {
      value = value.slice(0, ADMIN_USER_UTM_MAX_LENGTH);
    }
    if (value && !/^[a-z0-9_./+-]+$/i.test(value)) return "";
    return value;
  };
  const utmMedium = normalizeUtm(one("utm_medium"));
  const utmContent = normalizeUtm(one("utm_content"));

  return {
    page: parsePositiveInt(one("page"), 1),
    pageSize,
    q: q || undefined,
    planKey,
    subscriptionStatus,
    onboardingCompleted,
    duplicatesOnly: one("duplicates") === "1",
    pastDueOnly: one("past_due") === "1",
    cancelingOnly: one("canceling") === "1",
    checkoutPendingOnly: one("checkout_pending") === "1",
    utmSource: utmSource || undefined,
    utmMedium: utmMedium || undefined,
    utmContent: utmContent || undefined,
    createdFrom: parseAdminDateParam(one("created_from"), "start"),
    createdTo: parseAdminDateParam(one("created_to"), "end"),
    sort,
  };
}

/** Build query string preserving list filters (for pagination / CSV links). */
export function buildAdminUserListQuery(
  filters: AdminUserListFilters,
  overrides: Record<string, string | undefined> = {},
): string {
  const qs = new URLSearchParams();
  if (filters.q) qs.set("q", filters.q);
  if (filters.planKey && filters.planKey !== "any") qs.set("plan", filters.planKey);
  if (filters.subscriptionStatus && filters.subscriptionStatus !== "any") {
    qs.set("status", filters.subscriptionStatus);
  }
  if (filters.onboardingCompleted && filters.onboardingCompleted !== "any") {
    qs.set("onboarding", filters.onboardingCompleted);
  }
  if (filters.duplicatesOnly) qs.set("duplicates", "1");
  if (filters.pastDueOnly) qs.set("past_due", "1");
  if (filters.cancelingOnly) qs.set("canceling", "1");
  if (filters.checkoutPendingOnly) qs.set("checkout_pending", "1");
  if (filters.utmSource) qs.set("utm", filters.utmSource);
  if (filters.utmMedium) qs.set("utm_medium", filters.utmMedium);
  if (filters.utmContent) qs.set("utm_content", filters.utmContent);
  if (filters.createdFrom) {
    qs.set("created_from", filters.createdFrom.slice(0, 10));
  }
  if (filters.createdTo) {
    qs.set("created_to", filters.createdTo.slice(0, 10));
  }
  if (filters.sort && filters.sort !== "created_desc") {
    qs.set("sort", filters.sort);
  }
  if (filters.pageSize && filters.pageSize !== 25) {
    qs.set("pageSize", String(filters.pageSize));
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value == null || value === "") qs.delete(key);
    else qs.set(key, value);
  }
  return qs.toString();
}
