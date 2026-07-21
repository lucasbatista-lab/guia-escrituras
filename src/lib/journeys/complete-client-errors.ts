/**
 * Client-side mapping for journey step complete failures.
 * Pure helpers for unit tests — no spiritual content logged.
 */

export type JourneyCompleteErrorInput = {
  status: number;
  code?: string;
  message?: string;
};

export function mapJourneyCompleteError(
  input: JourneyCompleteErrorInput,
): string {
  if (input.status === 401 || input.code === "unauthorized") {
    return "Sua sessão expirou. Entre novamente para salvar o progresso.";
  }
  if (
    input.status === 403 ||
    input.code === "journeys_not_entitled" ||
    input.code === "forbidden"
  ) {
    return "Seu plano atual não inclui Jornadas completas. Compare os planos para continuar.";
  }
  if (input.status === 404 || input.code === "not_found") {
    return "Esta etapa não foi encontrada. Atualize a página e tente de novo.";
  }
  if (input.status === 409) {
    return "O progresso já estava salvo. Atualize a página se a etapa ainda parecer aberta.";
  }
  if (
    typeof input.message === "string" &&
    input.message.trim().length > 0 &&
    input.message.trim().length < 240
  ) {
    return input.message.trim();
  }
  return "Não foi possível salvar o progresso. Tente de novo.";
}

export function mapJourneyCompleteNetworkError(): string {
  return "Não foi possível salvar o progresso. Tente de novo.";
}
