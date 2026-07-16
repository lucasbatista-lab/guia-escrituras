import {
  resolveEffectiveSubscription,
  type SubscriptionCandidate,
} from "./effective-subscription";

export type CheckoutBlockReason = "existing_subscription";

export type CheckoutEligibility =
  | { eligible: true }
  | { eligible: false; reason: CheckoutBlockReason };

/**
 * Whether the user may start a new Stripe Checkout session.
 * Blocks when any live subscription (active/trialing, including cancel_at_period_end)
 * or past_due row exists — same entitlement source as auth/session.
 */
export function assessCheckoutEligibility(
  subscriptions: SubscriptionCandidate[],
): CheckoutEligibility {
  const effective = resolveEffectiveSubscription(subscriptions);
  if (effective) {
    return { eligible: false, reason: "existing_subscription" };
  }

  if (subscriptions.some((row) => row.status === "past_due")) {
    return { eligible: false, reason: "existing_subscription" };
  }

  return { eligible: true };
}
