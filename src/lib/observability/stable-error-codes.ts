/**
 * Stable client/ops-facing error codes — keep UI maps and logs aligned.
 * Do not log spiritual message bodies with these codes.
 */

export const STABLE_CHAT_ERROR_CODES = [
  "unauthenticated",
  "unauthorized",
  "subscription_required",
  "deep_response_not_entitled",
  "turn_in_progress",
  "budget_exceeded",
  "burst_exceeded",
  "rate_limited",
  "conversation_not_found",
  "not_found",
  "openai_unavailable",
  "biblical_corpus_unavailable",
  "model_rate_unconfigured",
  "ai_timeout",
  "ai_failed",
] as const;

export const STABLE_JOURNEY_ERROR_CODES = [
  "unauthorized",
  "journeys_not_entitled",
  "invalid_input",
  "persist_failed",
  "not_found",
] as const;

export type StableChatErrorCode = (typeof STABLE_CHAT_ERROR_CODES)[number];
export type StableJourneyErrorCode = (typeof STABLE_JOURNEY_ERROR_CODES)[number];

export function isStableChatErrorCode(code: string | undefined | null): boolean {
  if (!code) return false;
  return (STABLE_CHAT_ERROR_CODES as readonly string[]).includes(code);
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
  if (code && isStableChatErrorCode(code) && status < 500) {
    return "expected";
  }
  return "unexpected";
}
