/**
 * Client-side mapping of /api/chat error responses to human, actionable copy.
 * Kept pure for unit tests; must stay aligned with chat-service / route codes.
 */

export type ChatClientErrorInput = {
  status: number;
  code?: string;
  message?: string;
  retryAfterSeconds?: number | null;
};

export type ChatClientErrorKind =
  | "auth"
  | "subscription"
  | "plan_limit"
  | "daily_burst"
  | "rate_limit"
  | "in_progress"
  | "deep_not_entitled"
  | "unavailable"
  | "retryable";

export type ChatClientErrorView = {
  kind: ChatClientErrorKind;
  message: string;
  /** Keep pendingRequestId so the same send can be retried without duplicating. */
  keepPendingRequest: boolean;
  clearDeepPreference: boolean;
};

function formatWaitHint(retryAfterSeconds?: number | null): string {
  if (retryAfterSeconds == null || !Number.isFinite(retryAfterSeconds)) {
    return "";
  }
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  if (seconds < 90) {
    return ` Aguarde cerca de ${seconds}s e tente de novo.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return ` Aguarde cerca de ${minutes} min e tente de novo.`;
}

export function resolveChatClientError(
  input: ChatClientErrorInput,
): ChatClientErrorView {
  const code = input.code ?? "";
  const serverMessage = input.message?.trim();

  if (input.status === 401 || code === "unauthenticated" || code === "unauthorized") {
    return {
      kind: "auth",
      message: "Sua sessão expirou. Entre novamente para continuar.",
      keepPendingRequest: false,
      clearDeepPreference: false,
    };
  }

  if (input.status === 402 || code === "subscription_required") {
    return {
      kind: "subscription",
      message:
        "Sua assinatura não está ativa no momento. Revise em Conta para continuar.",
      keepPendingRequest: false,
      clearDeepPreference: false,
    };
  }

  if (code === "deep_response_not_entitled") {
    return {
      kind: "deep_not_entitled",
      message:
        serverMessage ||
        "A resposta aprofundada sob demanda está disponível no plano Profundo.",
      keepPendingRequest: false,
      clearDeepPreference: true,
    };
  }

  if (input.status === 409 || code === "turn_in_progress") {
    return {
      kind: "in_progress",
      message:
        serverMessage ||
        "Sua reflexão já está sendo preparada. Aguarde um momento antes de enviar de novo.",
      keepPendingRequest: true,
      clearDeepPreference: false,
    };
  }

  if (code === "budget_exceeded") {
    return {
      kind: "plan_limit",
      message:
        serverMessage ||
        "Você atingiu a margem de uso do seu plano por enquanto. Tente novamente mais tarde.",
      keepPendingRequest: false,
      clearDeepPreference: false,
    };
  }

  if (code === "burst_exceeded") {
    return {
      kind: "daily_burst",
      message:
        serverMessage ||
        "Você chegou ao limite diário de segurança. Pode continuar amanhã.",
      keepPendingRequest: false,
      clearDeepPreference: false,
    };
  }

  if (code === "rate_limited" || (input.status === 429 && !code)) {
    return {
      kind: "rate_limit",
      message:
        (serverMessage ||
          "Você enviou várias mensagens em pouco tempo.") +
        formatWaitHint(input.retryAfterSeconds),
      keepPendingRequest: true,
      clearDeepPreference: false,
    };
  }

  if (input.status === 429) {
    // Unknown 429 code — prefer server message, fall back to gentle frequency copy.
    return {
      kind: "rate_limit",
      message:
        (serverMessage ||
          "Você enviou várias mensagens em pouco tempo.") +
        formatWaitHint(input.retryAfterSeconds),
      keepPendingRequest: true,
      clearDeepPreference: false,
    };
  }

  if (
    input.status >= 500 ||
    code.startsWith("ai_") ||
    code === "openai_unavailable" ||
    code === "biblical_corpus_unavailable" ||
    code === "model_rate_unconfigured"
  ) {
    return {
      kind: "unavailable",
      message:
        serverMessage ||
        "O serviço está temporariamente indisponível. Sua mensagem foi mantida — tente novamente em instantes.",
      keepPendingRequest: true,
      clearDeepPreference: false,
    };
  }

  return {
    kind: "retryable",
    message:
      serverMessage ||
      "Não foi possível concluir esta reflexão agora. Sua mensagem continua aqui para você tentar novamente.",
    keepPendingRequest: true,
    clearDeepPreference: false,
  };
}

export function parseRetryAfterHeader(
  value: string | null | undefined,
): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.ceil(n);
}
