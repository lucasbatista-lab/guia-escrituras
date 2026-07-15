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

type StripeErrorShape = {
  type?: unknown;
  rawType?: unknown;
  code?: unknown;
  param?: unknown;
  statusCode?: unknown;
  status_code?: unknown;
  requestId?: unknown;
  request_id?: unknown;
  requestLogUrl?: unknown;
  request_log_url?: unknown;
  doc_url?: unknown;
  message?: unknown;
  raw?: unknown;
};

export type SafeStripeErrorDiagnostics = {
  stripe_type: string | null;
  stripe_raw_type: string | null;
  stripe_code: string | null;
  stripe_param: string | null;
  stripe_status_code: number | null;
  stripe_request_id: string | null;
  stripe_request_log_url: string | null;
  stripe_doc_url: string | null;
  stripe_message_safe: string | null;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const STRIPE_ID_RE =
  /\b(?:cus|sub|cs|price|prod|pm|pi|in|evt)_[A-Za-z0-9_]+\b/g;
const SECRET_RE =
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+\b|\bwhsec_[A-Za-z0-9]+\b|\bBearer\s+[A-Za-z0-9._\-]+\b/gi;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStatusCode(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const code = Math.trunc(value);
  if (code < 100 || code > 599) return null;
  return code;
}

function pickString(
  primary: StripeErrorShape | null,
  raw: StripeErrorShape | null,
  keys: (keyof StripeErrorShape)[],
): string | null {
  for (const key of keys) {
    const fromPrimary = primary ? asNonEmptyString(primary[key]) : null;
    if (fromPrimary) return fromPrimary;
    const fromRaw = raw ? asNonEmptyString(raw[key]) : null;
    if (fromRaw) return fromRaw;
  }
  return null;
}

function pickStatusCode(
  primary: StripeErrorShape | null,
  raw: StripeErrorShape | null,
): number | null {
  const fromPrimary = primary
    ? asStatusCode(primary.statusCode) ?? asStatusCode(primary.status_code)
    : null;
  if (fromPrimary !== null) return fromPrimary;
  const fromRaw = raw
    ? asStatusCode(raw.statusCode) ?? asStatusCode(raw.status_code)
    : null;
  return fromRaw;
}

/** Sanitize Stripe/error messages for logs — never secrets or full resource IDs. */
export function sanitizeStripeErrorMessage(message: unknown): string | null {
  const raw = asNonEmptyString(message);
  if (!raw) return null;
  const sanitized = raw
    .replace(SECRET_RE, "[redacted]")
    .replace(EMAIL_RE, "[email]")
    .replace(STRIPE_ID_RE, "[id]");
  return sanitized.slice(0, 300);
}

/** Extract safe Stripe diagnostic fields from error and error.raw. */
export function extractSafeStripeErrorDiagnostics(
  error: unknown,
): SafeStripeErrorDiagnostics {
  if (!error || typeof error !== "object") {
    return {
      stripe_type: null,
      stripe_raw_type: null,
      stripe_code: null,
      stripe_param: null,
      stripe_status_code: null,
      stripe_request_id: null,
      stripe_request_log_url: null,
      stripe_doc_url: null,
      stripe_message_safe: null,
    };
  }

  const primary = error as StripeErrorShape;
  const raw =
    primary.raw && typeof primary.raw === "object"
      ? (primary.raw as StripeErrorShape)
      : null;

  return {
    stripe_type: pickString(primary, raw, ["type"]),
    stripe_raw_type: pickString(primary, raw, ["rawType"]),
    stripe_code: pickString(primary, raw, ["code"]),
    stripe_param: pickString(primary, raw, ["param"]),
    stripe_status_code: pickStatusCode(primary, raw),
    stripe_request_id: pickString(primary, raw, ["requestId", "request_id"]),
    stripe_request_log_url: pickString(primary, raw, [
      "requestLogUrl",
      "request_log_url",
    ]),
    stripe_doc_url: pickString(primary, raw, ["doc_url"]),
    stripe_message_safe: sanitizeStripeErrorMessage(
      pickString(primary, raw, ["message"]),
    ),
  };
}

export type MappedStripeCheckoutError = {
  code: CheckoutFailureCode;
  providerCode: string | null;
  /** Safe Stripe error.type when present (logging only). */
  stripeType: string | null;
  /** Safe Stripe error.code when present (logging only). */
  stripeCode: string | null;
  /** Safe Stripe error.param when present (logging only). */
  stripeParam: string | null;
};

/** Map Stripe / unknown errors without exposing provider details. */
export function mapStripeCheckoutError(error: unknown): MappedStripeCheckoutError {
  if (!error || typeof error !== "object") {
    return {
      code: "checkout_failed",
      providerCode: null,
      stripeType: null,
      stripeCode: null,
      stripeParam: null,
    };
  }

  const diagnostics = extractSafeStripeErrorDiagnostics(error);
  const err = error as StripeErrorShape;
  const providerCode = diagnostics.stripe_code;
  const message = (asNonEmptyString(err.message) ?? "").toLowerCase();
  const statusCode = diagnostics.stripe_status_code;

  const preserved = {
    stripeType: diagnostics.stripe_type,
    stripeCode: diagnostics.stripe_code,
    stripeParam: diagnostics.stripe_param,
  };

  if (/no such customer/i.test(message)) {
    return { code: "customer_failed", providerCode, ...preserved };
  }

  if (
    /no such price/i.test(message) ||
    providerCode === "resource_missing"
  ) {
    return { code: "price_unavailable", providerCode, ...preserved };
  }

  if (
    providerCode === "account_invalid" ||
    providerCode === "account_closed" ||
    /not (been )?activated|charges.?enabled|account.?invalid/i.test(message)
  ) {
    return { code: "stripe_account_unavailable", providerCode, ...preserved };
  }

  if (
    providerCode === "rate_limit" ||
    providerCode === "lock_timeout" ||
    statusCode === 429 ||
    statusCode === 503 ||
    /temporarily unavailable|try again later/i.test(message)
  ) {
    return { code: "stripe_temporary", providerCode, ...preserved };
  }

  if (providerCode === "customer_tax_location_invalid") {
    return { code: "customer_failed", providerCode, ...preserved };
  }

  return { code: "checkout_failed", providerCode, ...preserved };
}
