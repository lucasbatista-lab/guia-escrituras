import type { PlanKey } from "@/lib/entitlements";

/**
 * Billing channel that owns a charge relationship.
 * Distinct from ACCESS: a user may have access via Apple while Stripe still bills.
 */
export type BillingProvider = "stripe" | "apple" | "manual";

/** Rank for multi-source ACCESS resolution — higher wins when both grants are valid. */
const PLAN_ACCESS_RANK: Record<PlanKey, number> = {
  essencial: 1,
  caminho: 2,
  profundo: 3,
  particular: 4,
};

export function planAccessRank(planKey: PlanKey): number {
  return PLAN_ACCESS_RANK[planKey] ?? 0;
}

export function deriveBillingProvider(input: {
  stripeSubscriptionId?: string | null;
  provider?: BillingProvider | null;
}): BillingProvider {
  if (input.provider) return input.provider;
  if (input.stripeSubscriptionId?.trim()) return "stripe";
  return "manual";
}
