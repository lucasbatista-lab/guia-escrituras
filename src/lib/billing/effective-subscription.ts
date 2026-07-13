import type { PlanKey } from "@/lib/entitlements";
import type { SubscriptionStatus } from "@/lib/billing";

export interface SubscriptionCandidate {
  id: string;
  userId: string;
  planKey: PlanKey;
  status: SubscriptionStatus | string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
}

export interface EffectiveSubscription {
  subscription: SubscriptionCandidate;
  hasDuplicates: boolean;
  activeCount: number;
}

const LIVE_STATUSES = new Set(["active", "trialing"]);

export function isLiveSubscriptionStatus(status: string): boolean {
  return LIVE_STATUSES.has(status);
}

function hasStripeLink(sub: SubscriptionCandidate): boolean {
  return Boolean(sub.stripeSubscriptionId?.trim());
}

function periodEndMs(sub: SubscriptionCandidate): number {
  if (!sub.currentPeriodEnd) return 0;
  const ms = new Date(sub.currentPeriodEnd).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function createdAtMs(sub: SubscriptionCandidate): number {
  const ms = new Date(sub.createdAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Resolves the single effective subscription for a user.
 * Priority among active|trialing:
 * 1) stripe_subscription_id present
 * 2) farthest current_period_end
 * 3) most recent created_at
 */
export function resolveEffectiveSubscription(
  candidates: SubscriptionCandidate[],
): EffectiveSubscription | null {
  const live = candidates.filter((c) => isLiveSubscriptionStatus(c.status));
  if (live.length === 0) return null;

  const sorted = [...live].sort((a, b) => {
    const stripeDiff = Number(hasStripeLink(b)) - Number(hasStripeLink(a));
    if (stripeDiff !== 0) return stripeDiff;

    const periodDiff = periodEndMs(b) - periodEndMs(a);
    if (periodDiff !== 0) return periodDiff;

    return createdAtMs(b) - createdAtMs(a);
  });

  const winner = sorted[0];
  if (!winner) return null;

  return {
    subscription: winner,
    hasDuplicates: live.length > 1,
    activeCount: live.length,
  };
}

/**
 * Deduplicate live subscriptions to one effective row per user (for MRR / counts).
 */
export function selectEffectiveSubscriptionsByUser(
  candidates: SubscriptionCandidate[],
): {
  effective: SubscriptionCandidate[];
  usersWithDuplicates: number;
} {
  const byUser = new Map<string, SubscriptionCandidate[]>();
  for (const row of candidates) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const effective: SubscriptionCandidate[] = [];
  let usersWithDuplicates = 0;

  for (const [, list] of byUser) {
    const resolved = resolveEffectiveSubscription(list);
    if (!resolved) continue;
    effective.push(resolved.subscription);
    if (resolved.hasDuplicates) usersWithDuplicates += 1;
  }

  return { effective, usersWithDuplicates };
}
