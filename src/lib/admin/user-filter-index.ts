import type { PlanKey } from "@/lib/entitlements";
import {
  resolveEffectiveSubscription,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";

export interface AdminUserSubscriptionView {
  userId: string;
  planKey: PlanKey | null;
  subscriptionStatus: string | null;
  hasDuplicateSubscriptions: boolean;
  isPastDue: boolean;
}

export interface AdminUserFilterMatchInput {
  planKey?: PlanKey | "any";
  subscriptionStatus?: string;
  onboardingCompleted?: "any" | "yes" | "no";
  duplicatesOnly?: boolean;
  pastDueOnly?: boolean;
}

/**
 * Build per-user subscription views from fully-loaded live + past_due rows.
 * Callers must pass complete candidate sets (paginated fetch), not a truncated page.
 */
export function buildUserSubscriptionViews(
  liveCandidates: SubscriptionCandidate[],
  pastDueUserIds: ReadonlySet<string>,
): Map<string, AdminUserSubscriptionView> {
  const byUser = new Map<string, SubscriptionCandidate[]>();
  for (const row of liveCandidates) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const views = new Map<string, AdminUserSubscriptionView>();
  const allUserIds = new Set<string>([
    ...byUser.keys(),
    ...pastDueUserIds,
  ]);

  for (const userId of allUserIds) {
    const list = byUser.get(userId) ?? [];
    const resolved = resolveEffectiveSubscription(list);
    const liveCount = list.length;
    const isPastDue = pastDueUserIds.has(userId);
    views.set(userId, {
      userId,
      planKey: resolved?.subscription.planKey ?? null,
      subscriptionStatus: isPastDue
        ? "past_due"
        : (resolved?.subscription.status ?? null),
      hasDuplicateSubscriptions: liveCount > 1,
      isPastDue,
    });
  }

  return views;
}

export function matchesAdminUserFilters(
  view: AdminUserSubscriptionView | undefined,
  onboardingCompleted: boolean | null | undefined,
  filters: AdminUserFilterMatchInput,
): boolean {
  const planKey = view?.planKey ?? null;
  const subscriptionStatus = view?.subscriptionStatus ?? null;
  const statusKey = subscriptionStatus ?? "none";
  const hasDuplicates = view?.hasDuplicateSubscriptions ?? false;
  const isPastDue = view?.isPastDue ?? false;

  if (filters.planKey && filters.planKey !== "any" && planKey !== filters.planKey) {
    return false;
  }
  if (
    filters.subscriptionStatus &&
    filters.subscriptionStatus !== "any" &&
    statusKey !== filters.subscriptionStatus
  ) {
    return false;
  }
  if (filters.onboardingCompleted === "yes" && onboardingCompleted !== true) {
    return false;
  }
  if (filters.onboardingCompleted === "no" && onboardingCompleted === true) {
    return false;
  }
  if (filters.duplicatesOnly && !hasDuplicates) {
    return false;
  }
  if (filters.pastDueOnly && !isPastDue) {
    return false;
  }
  return true;
}
