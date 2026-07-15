/**
 * Typed checkout failure codes — never includes secrets or Stripe IDs.
 */

export type CheckoutFailureCode =
  | "unauthenticated"
  | "config_missing"
  | "invalid_intent"
  | "forbidden"
  | "expired"
  | "used"
  | "price_unavailable"
  | "stripe_account_unavailable"
  | "stripe_temporary"
  | "customer_failed"
  | "checkout_failed";

export type CheckoutStage =
  | "auth"
  | "config"
  | "intent"
  | "preflight"
  | "reuse_session"
  | "customer"
  | "create_session"
  | "persist";

const USER_MESSAGES: Record<CheckoutFailureCode, string> = {
  unauthenticated: "Faça login para continuar o pagamento.",
  config_missing:
    "O pagamento está temporariamente indisponível. Tente novamente em instantes.",
  invalid_intent:
    "Não encontramos esta continuação de assinatura. Escolha o plano novamente.",
  forbidden: "Esta continuação pertence a outra conta.",
  expired: "Este link de continuação expirou. Escolha o plano novamente.",
  used: "Este passo já foi utilizado. Veja o status na sua conta.",
  price_unavailable:
    "O plano selecionado não está disponível para cobrança agora. Tente novamente em instantes.",
  stripe_account_unavailable:
    "A cobrança ainda não está disponível nesta conta. Tente novamente em breve.",
  stripe_temporary:
    "A Stripe está temporariamente indisponível. Aguarde um momento e tente novamente.",
  customer_failed:
    "Não foi possível preparar sua conta de pagamento. Tente novamente.",
  checkout_failed:
    "Não foi possível iniciar o pagamento seguro. Tente novamente.",
};

export function checkoutFailureMessage(code: CheckoutFailureCode): string {
  return USER_MESSAGES[code];
}

export function shortCheckoutRef(requestId: string): string {
  return requestId.replace(/-/g, "").slice(0, 8);
}

/** Map Stripe / unknown errors without exposing provider details. */
export function mapStripeCheckoutError(error: unknown): {
  code: CheckoutFailureCode;
  providerCode: string | null;
} {
  if (!error || typeof error !== "object") {
    return { code: "checkout_failed", providerCode: null };
  }
  const err = error as {
    code?: string;
    type?: string;
    message?: string;
    statusCode?: number;
    rawType?: string;
  };
  const providerCode = typeof err.code === "string" ? err.code : null;
  const message = (err.message ?? "").toLowerCase();

  if (/no such customer/i.test(message)) {
    return { code: "customer_failed", providerCode };
  }

  if (
    /no such price/i.test(message) ||
    providerCode === "resource_missing"
  ) {
    return { code: "price_unavailable", providerCode };
  }

  if (
    providerCode === "account_invalid" ||
    providerCode === "account_closed" ||
    /not (been )?activated|charges.?enabled|account.?invalid/i.test(message)
  ) {
    return { code: "stripe_account_unavailable", providerCode };
  }

  if (
    providerCode === "rate_limit" ||
    providerCode === "lock_timeout" ||
    err.statusCode === 429 ||
    err.statusCode === 503 ||
    /temporarily unavailable|try again later/i.test(message)
  ) {
    return { code: "stripe_temporary", providerCode };
  }

  if (providerCode === "customer_tax_location_invalid") {
    return { code: "customer_failed", providerCode };
  }

  return { code: "checkout_failed", providerCode };
}
