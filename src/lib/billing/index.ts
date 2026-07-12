/**
 * Billing domain — prepared for Stripe, without real checkout in this slice.
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
 * Placeholder for future Stripe Checkout Session creation.
 * Intentionally throws until Stripe is wired.
 */
export async function createCheckoutSessionPlaceholder(input: {
  userId: string;
  planKey: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<never> {
  void input;
  throw new Error(
    "Checkout Stripe ainda não configurado. Veja docs/NEXT_STEPS.md.",
  );
}
