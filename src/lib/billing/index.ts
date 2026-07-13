/**
 * Billing domain — Stripe subscription checkout (sandbox-ready).
 */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid";

export interface SubscriptionSnapshot {
  userId: string;
  planKey: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
}

/** User-facing statuses that may be shown; users cannot mutate payment fields. */
export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export function subscriptionStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "trialing":
      return "Período de experiência";
    case "past_due":
      return "Pagamento pendente";
    case "canceled":
      return "Cancelada";
    case "incomplete":
      return "Incompleta";
    case "unpaid":
      return "Não paga";
  }
}

/**
 * @deprecated Use createSubscriptionCheckout via startCheckoutAction.
 */
export async function createCheckoutSessionPlaceholder(input: {
  userId: string;
  planKey: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<never> {
  void input;
  throw new Error("Use createSubscriptionCheckout.");
}

export { startCheckoutAction } from "./checkout-action";
export {
  resolveEffectiveSubscription,
  selectEffectiveSubscriptionsByUser,
  isLiveSubscriptionStatus,
  type SubscriptionCandidate,
  type EffectiveSubscription,
} from "./effective-subscription";
export {
  getEffectiveSubscriptionForUser,
  loadUserSubscriptions,
  userHasBillingCustomer,
} from "./subscription-lookup";
