export interface ModelCostRate {
  model: string;
  /** Microdólares (USD * 1e6) por 1M tokens de entrada. */
  inputUsdMicrosPerMillion: number;
  /** Microdólares (USD * 1e6) por 1M tokens de saída. */
  outputUsdMicrosPerMillion: number;
}

/** Taxas de planejamento — não são fatura real da OpenAI. */
export const PLANNING_MODEL_RATES: ModelCostRate[] = [
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

export function getModelRate(model: string): ModelCostRate {
  return (
    PLANNING_MODEL_RATES.find((rate) => rate.model === model) ?? {
      model,
      inputUsdMicrosPerMillion: 2_000_000,
      outputUsdMicrosPerMillion: 8_000_000,
    }
  );
}

export function calculateTokenCost(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  usdBrlPlanningRate: number;
}): {
  estimatedCostUsdMicros: number;
  estimatedCostBrlCents: number;
} {
  const rate = getModelRate(input.model);
  const inputMicros = Math.round(
    (input.inputTokens / 1_000_000) * rate.inputUsdMicrosPerMillion,
  );
  const outputMicros = Math.round(
    (input.outputTokens / 1_000_000) * rate.outputUsdMicrosPerMillion,
  );
  const estimatedCostUsdMicros = inputMicros + outputMicros;

  // USD micros → BRL cents: (micros / 1e6) * rate * 100
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
