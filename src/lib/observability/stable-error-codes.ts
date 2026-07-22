/**
 * Stable client/ops-facing error codes — keep UI maps and logs aligned.
 * Do not log spiritual message bodies with these codes.
 *
 * Architecture: catalogs by domain (chat / journeys / shared ops helpers).
 * Only codes that are already emitted by the product belong here.
 * Unknown codes remain safe via isStable* helpers returning false.
 */

/** Codes emitted by /api/chat, chat-service, AI providers, and related gates. */
export const STABLE_CHAT_ERROR_CODES = [
  "unauthenticated",
  "unauthorized",
  "subscription_required",
  "personalization_required",
  "missing_entitlement",
  "deep_response_not_entitled",
  "turn_in_progress",
  "budget_exceeded",
  "burst_exceeded",
  "rate_limited",
  "conversation_not_found",
  "not_found",
  "validation_error",
  "unsafe_input",
  "openai_unavailable",
  "biblical_corpus_unavailable",
  "biblical_corpus_invalid",
  "model_rate_unconfigured",
  "ai_timeout",
  "ai_failed",
  "ai_incomplete",
  "ai_invalid_output",
  "ai_identity_violation",
  "ai_provider_rate_limited",
  "ai_provider_unavailable",
  "feature_temporarily_disabled",
] as const;

/** Codes emitted by journey APIs and progress helpers. */
export const STABLE_JOURNEY_ERROR_CODES = [
  "unauthorized",
  "journeys_not_entitled",
  "invalid_input",
  "invalid_journey",
  "journey_not_found",
  "step_not_found",
  "invalid_event",
  "method_not_allowed",
  "persist_failed",
  "not_found",
  "feature_temporarily_disabled",
] as const;

/**
 * Cross-domain codes useful for support/ops correlation (already emitted).
 * Not every auth/stripe string is listed — only high-frequency stable ones.
 */
export const STABLE_OPS_ERROR_CODES = [
  "forbidden",
  "config_missing",
  "method_not_allowed",
  "export_too_large",
  "export_failed",
  "admin_query_failed",
  "admin_client_unavailable",
  "cron_not_configured",
  "cron_unauthorized",
  "db_error",
  "partial_persist",
  "supabase_unavailable",
  "internal_error",
] as const;

export type StableChatErrorCode = (typeof STABLE_CHAT_ERROR_CODES)[number];
export type StableJourneyErrorCode = (typeof STABLE_JOURNEY_ERROR_CODES)[number];
export type StableOpsErrorCode = (typeof STABLE_OPS_ERROR_CODES)[number];

export function isStableChatErrorCode(code: string | undefined | null): boolean {
  if (!code) return false;
  return (STABLE_CHAT_ERROR_CODES as readonly string[]).includes(code);
}

export function isStableJourneyErrorCode(
  code: string | undefined | null,
): boolean {
  if (!code) return false;
  return (STABLE_JOURNEY_ERROR_CODES as readonly string[]).includes(code);
}

export function isStableOpsErrorCode(code: string | undefined | null): boolean {
  if (!code) return false;
  return (STABLE_OPS_ERROR_CODES as readonly string[]).includes(code);
}

/** True if the code is catalogued in any stable domain list. */
export function isStableErrorCode(code: string | undefined | null): boolean {
  return (
    isStableChatErrorCode(code) ||
    isStableJourneyErrorCode(code) ||
    isStableOpsErrorCode(code)
  );
}

export function classifyFailureKind(
  status: number,
  code?: string | null,
): "expected" | "unexpected" {
  if (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 429
  ) {
    return "expected";
  }
  if (
    code &&
    (isStableChatErrorCode(code) || isStableJourneyErrorCode(code)) &&
    status < 500
  ) {
    return "expected";
  }
  return "unexpected";
}
