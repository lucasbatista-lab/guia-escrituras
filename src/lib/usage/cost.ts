export interface ModelCostRate {
  model: string;
  /** Microdólares (USD * 1e6) por 1M tokens de entrada. */
  inputUsdMicrosPerMillion: number;
  /** Microdólares (USD * 1e6) por 1M tokens de saída. */
  outputUsdMicrosPerMillion: number;
  /** Microdólares por 1M tokens de input em cache, quando aplicável. */
  cachedInputUsdMicrosPerMillion?: number;
}

/**
 * Taxas de PLANEJAMENTO interno — não são valores faturados pela OpenAI.
 * Cada modelo precisa de entrada explícita; não inferir pelo prefixo.
 */
export const PLANNING_MODEL_RATES: ModelCostRate[] = [
  {
    model: "gpt-5-mini",
    // US$0.25 / 1M input → 250_000 micros por 1M tokens
    inputUsdMicrosPerMillion: 250_000,
    // Cached input (quando o provedor reportar): metade do input padrão
    cachedInputUsdMicrosPerMillion: 125_000,
    // US$2.00 / 1M output → 2_000_000 micros por 1M tokens
    outputUsdMicrosPerMillion: 2_000_000,
  },
  {
    model: "gpt-4.1-mini",
    inputUsdMicrosPerMillion: 400_000,
    outputUsdMicrosPerMillion: 1_600_000,
  },
  {
    model: "gpt-4.1",
    inputUsdMicrosPerMillion: 2_000_000,
    outputUsdMicrosPerMillion: 8_000_000,
  },
  {
    model: "mock",
    inputUsdMicrosPerMillion: 0,
    outputUsdMicrosPerMillion: 0,
  },
];

export class UnknownModelRateError extends Error {
  constructor(public readonly model: string) {
    super(
      `Taxa de planejamento ausente para o modelo "${model}". Configure PLANNING_MODEL_RATES explicitamente — não inferir pelo prefixo.`,
    );
    this.name = "UnknownModelRateError";
  }
}

export function getModelRate(model: string): ModelCostRate {
  const exact = PLANNING_MODEL_RATES.find((rate) => rate.model === model);
  if (exact) return exact;
  throw new UnknownModelRateError(model);
}

export function calculateTokenCost(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  usdBrlPlanningRate: number;
  cachedInputTokens?: number;
}): {
  estimatedCostUsdMicros: number;
  estimatedCostBrlCents: number;
} {
  const rate = getModelRate(input.model);
  const cached = Math.max(0, input.cachedInputTokens ?? 0);
  const billedInput = Math.max(0, input.inputTokens - cached);

  const inputMicros = Math.round(
    (billedInput / 1_000_000) * rate.inputUsdMicrosPerMillion,
  );
  const cachedMicros =
    cached > 0 && rate.cachedInputUsdMicrosPerMillion != null
      ? Math.round(
          (cached / 1_000_000) * rate.cachedInputUsdMicrosPerMillion,
        )
      : 0;
  const outputMicros = Math.round(
    (input.outputTokens / 1_000_000) * rate.outputUsdMicrosPerMillion,
  );
  const estimatedCostUsdMicros = inputMicros + cachedMicros + outputMicros;

  // USD micros → BRL cents with monetary rounding
  const estimatedCostBrlCents = Math.round(
    (estimatedCostUsdMicros / 1_000_000) * input.usdBrlPlanningRate * 100,
  );

  return { estimatedCostUsdMicros, estimatedCostBrlCents };
}

export function getUsdBrlPlanningRate(): number {
  const raw = process.env.USD_BRL_PLANNING_RATE;
  const parsed = raw ? Number.parseFloat(raw) : 5.5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5.5;
}
