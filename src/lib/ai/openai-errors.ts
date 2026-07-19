import { AppError } from "@/lib/safety";

export type MappedOpenAiFailure = {
  code:
    | "ai_provider_rate_limited"
    | "ai_timeout"
    | "ai_provider_unavailable"
    | "ai_failed";
  status: 503;
  safeMessage: string;
  retryAfterSeconds?: number;
  failureType: string;
};

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  for (const candidate of [e.status, e.statusCode, e.response?.status]) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function readRetryAfterSeconds(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const headers = (error as { headers?: unknown }).headers;
  if (!headers || typeof headers !== "object") return undefined;
  const raw =
    (headers as Record<string, unknown>)["retry-after"] ??
    (headers as Record<string, unknown>)["Retry-After"];
  if (raw == null) return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.ceil(n), 600);
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: string; message?: string };
  const name = (e.name ?? "").toLowerCase();
  const code = (e.code ?? "").toLowerCase();
  const message = (e.message ?? "").toLowerCase();
  return (
    name.includes("timeout") ||
    name.includes("abort") ||
    code === "etimedout" ||
    code === "abort_err" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("aborted")
  );
}

/**
 * Map provider SDK failures to safe AppError fields without leaking raw bodies.
 * Provider overload (429) and outages (5xx) surface as 503 — temporary unavailability —
 * distinct from our own technical rate_limited (429).
 */
export function mapOpenAiProviderError(error: unknown): MappedOpenAiFailure {
  if (isTimeoutError(error)) {
    return {
      code: "ai_timeout",
      status: 503,
      safeMessage:
        "A reflexão demorou mais do que o esperado. Sua mensagem foi mantida — tente novamente em instantes.",
      failureType: "timeout",
    };
  }

  const status = readStatus(error);
  if (status === 429) {
    const retryAfterSeconds = readRetryAfterSeconds(error) ?? 30;
    return {
      code: "ai_provider_rate_limited",
      status: 503,
      safeMessage:
        "O serviço de reflexão está momentaneamente ocupado. Aguarde um pouco e tente novamente.",
      retryAfterSeconds,
      failureType: "provider_429",
    };
  }

  if (status != null && status >= 500 && status < 600) {
    return {
      code: "ai_provider_unavailable",
      status: 503,
      safeMessage:
        "O serviço de reflexão está temporariamente indisponível. Tente novamente em instantes.",
      failureType: `provider_${status}`,
    };
  }

  return {
    code: "ai_failed",
    status: 503,
    safeMessage:
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    failureType: status != null ? `provider_${status}` : "provider_unknown",
  };
}

export function openAiFailureToAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const mapped = mapOpenAiProviderError(error);
  return new AppError(
    mapped.code,
    mapped.code,
    mapped.status,
    mapped.safeMessage,
    mapped.retryAfterSeconds,
  );
}
