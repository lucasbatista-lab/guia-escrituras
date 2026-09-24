import "server-only";

import type { EntitlementKey, PlanKey } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";
import {
  isLiveSubscriptionStatus,
  resolveEffectiveSubscription,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import {
  deriveBillingProvider,
  planAccessRank,
  type BillingProvider,
} from "@/lib/billing/providers";
import {
  getAppleIapConfig,
  isAppleIapConfigured,
} from "@/lib/apple/config";
import { loadAppleSubscriptionsForUser } from "@/lib/apple/persistence";
import { appleAccessStatusToResolverStatus } from "@/lib/apple/status";

/**
 * Provider-neutral grant that can feed access resolution.
 * Stripe rows map here today; Apple will map here after persistence exists.
 */
export interface AccessCandidate {
  provider: BillingProvider;
  planKey: PlanKey;
  status: string;
  currentPeriodEnd: string | null;
  /** Opaque external subscription id (Stripe sub_*, Apple originalTransactionId, etc.). */
  externalSubscriptionId?: string | null;
  createdAt?: string | null;
}

export interface EffectiveAccess {
  /** Null = FREE (no paid live grant). */
  planKey: PlanKey | null;
  entitlements: EntitlementKey[];
  status: string | null;
  currentPeriodEnd: string | null;
  /** Provider of the winning ACCESS grant. */
  accessSource: BillingProvider | null;
  /** Providers with a currently live grant (may include lower tiers still billing). */
  billingSources: BillingProvider[];
  hasDuplicates: boolean;
  /** True when more than one provider contributes a live grant. */
  multiProvider: boolean;
}

function periodEndMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function createdAtMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function subscriptionCandidateToAccess(
  row: SubscriptionCandidate,
): AccessCandidate {
  return {
    provider: deriveBillingProvider({
      stripeSubscriptionId: row.stripeSubscriptionId,
    }),
    planKey: row.planKey,
    status: String(row.status),
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    externalSubscriptionId: row.stripeSubscriptionId ?? null,
    createdAt: row.createdAt,
  };
}

function emptyAccess(): EffectiveAccess {
  return {
    planKey: null,
    entitlements: [],
    status: null,
    currentPeriodEnd: null,
    accessSource: null,
    billingSources: [],
    hasDuplicates: false,
    multiProvider: false,
  };
}

function accessFromWinner(
  winner: AccessCandidate,
  live: AccessCandidate[],
): EffectiveAccess {
  const entitlements = resolveEntitlements({ planKey: winner.planKey }).entitlements;
  const billingSources = Array.from(new Set(live.map((c) => c.provider)));
  const providers = new Set(live.map((c) => c.provider));
  return {
    planKey: winner.planKey,
    entitlements,
    status: winner.status,
    currentPeriodEnd: winner.currentPeriodEnd,
    accessSource: winner.provider,
    billingSources,
    hasDuplicates: live.length > 1,
    multiProvider: providers.size > 1,
  };
}

/**
 * Multi-source ACCESS policy (future Stripe + Apple):
 * among currently valid grants, highest planAccessRank wins.
 * Does NOT auto-cancel lower-tier billing — ACCESS ≠ BILLING OWNERSHIP.
 */
export function resolveEffectiveAccessMultiSource(
  candidates: AccessCandidate[],
): EffectiveAccess {
  const live = candidates.filter((c) => isLiveSubscriptionStatus(c.status));
  if (live.length === 0) return emptyAccess();

  const sorted = [...live].sort((a, b) => {
    const rankDiff = planAccessRank(b.planKey) - planAccessRank(a.planKey);
    if (rankDiff !== 0) return rankDiff;
    const periodDiff =
      periodEndMs(b.currentPeriodEnd) - periodEndMs(a.currentPeriodEnd);
    if (periodDiff !== 0) return periodDiff;
    return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  });

  const winner = sorted[0];
  if (!winner) return emptyAccess();
  return accessFromWinner(winner, live);
}

/**
 * Stripe/manual path — preserves historical resolveEffectiveSubscription priority
 * (stripe link → farthest period end → newest created). Used when no Apple candidates.
 */
export function resolveEffectiveAccessFromSubscriptions(
  rows: SubscriptionCandidate[],
): EffectiveAccess {
  const mapped = rows.map(subscriptionCandidateToAccess);
  const hasApple = mapped.some((c) => c.provider === "apple");
  if (hasApple) {
    return resolveEffectiveAccessMultiSource(mapped);
  }

  const effective = resolveEffectiveSubscription(rows);
  if (!effective) return emptyAccess();

  const winner = subscriptionCandidateToAccess(effective.subscription);
  const live = mapped.filter((c) => isLiveSubscriptionStatus(c.status));
  return accessFromWinner(winner, live);
}

/**
 * Canonical server entry for "what can this user access?"
 * Stripe rows + bound Apple subscriptions (configured environment only).
 * Stripe-only users keep historical resolveEffectiveSubscription semantics.
 */
export async function getEffectiveAccessForUser(
  userId: string,
  options?: { useAdmin?: boolean },
): Promise<EffectiveAccess> {
  const rows = await loadUserSubscriptions(userId, options);

  if (!isAppleIapConfigured()) {
    return resolveEffectiveAccessFromSubscriptions(rows);
  }

  let appleEnv: "sandbox" | "production";
  try {
    appleEnv = getAppleIapConfig().environment;
  } catch {
    return resolveEffectiveAccessFromSubscriptions(rows);
  }

  const appleRows = (await loadAppleSubscriptionsForUser(userId)).filter(
    (row) => row.environment === appleEnv,
  );

  if (appleRows.length === 0) {
    return resolveEffectiveAccessFromSubscriptions(rows);
  }

  const stripeCandidates = rows.map(subscriptionCandidateToAccess);
  const appleCandidates: AccessCandidate[] = appleRows.map((row) => ({
    provider: "apple" as const,
    planKey: row.planKey,
    status: appleAccessStatusToResolverStatus(row.accessStatus),
    currentPeriodEnd: row.expiresAt,
    externalSubscriptionId: row.originalTransactionId,
    createdAt: row.createdAt,
  }));

  return resolveEffectiveAccessMultiSource([
    ...stripeCandidates,
    ...appleCandidates,
  ]);
}

/**
 * Test/helper: resolve from mixed provider candidates without DB.
 * Prefer this for multi-provider contract tests.
 */
export function resolveEffectiveAccess(
  candidates: AccessCandidate[],
): EffectiveAccess {
  return resolveEffectiveAccessMultiSource(candidates);
}
