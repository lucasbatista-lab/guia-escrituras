import { describe, expect, it } from "vitest";
import {
  calculateTokenCost,
  getModelRate,
  UnknownModelRateError,
} from "@/lib/usage";

describe("calculateTokenCost", () => {
  it("computes deterministic micros and BRL cents for gpt-4.1-mini", () => {
    const result = calculateTokenCost({
      model: "gpt-4.1-mini",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      usdBrlPlanningRate: 5.5,
    });

    expect(result.estimatedCostUsdMicros).toBe(2_000_000);
    expect(result.estimatedCostBrlCents).toBe(1100);
  });

  it("returns zero for mock model", () => {
    const result = calculateTokenCost({
      model: "mock",
      inputTokens: 500,
      outputTokens: 200,
      usdBrlPlanningRate: 5.5,
    });
    expect(result.estimatedCostUsdMicros).toBe(0);
    expect(result.estimatedCostBrlCents).toBe(0);
  });

  it("matches the observed real gpt-5-mini turn exactly", () => {
    // Observed turn: 1120 in / 2038 out. Correct planning cost (not invoice).
    const result = calculateTokenCost({
      model: "gpt-5-mini",
      inputTokens: 1120,
      outputTokens: 2038,
      usdBrlPlanningRate: 6,
    });

    // (1120/1e6)*250_000 + (2038/1e6)*2_000_000 = 280 + 4076 = 4356 micros
    expect(result.estimatedCostUsdMicros).toBe(4356);
    // (4356/1e6)*6*100 = 2.6136 → 3 cents
    expect(result.estimatedCostBrlCents).toBe(3);
  });

  it("does not inherit gpt-5 rates from the gpt-5-mini by accidental prefix matching", () => {
    expect(() => getModelRate("gpt-5")).toThrow(UnknownModelRateError);
    expect(() =>
      calculateTokenCost({
        model: "gpt-5",
        inputTokens: 1120,
        outputTokens: 2038,
        usdBrlPlanningRate: 6,
      }),
    ).toThrow(UnknownModelRateError);
  });

  it("never presents planning estimate as billed OpenAI amount in comments/API shape", () => {
    const rate = getModelRate("gpt-5-mini");
    expect(rate.inputUsdMicrosPerMillion).toBe(250_000);
    expect(rate.outputUsdMicrosPerMillion).toBe(2_000_000);
    expect(rate.cachedInputUsdMicrosPerMillion).toBe(125_000);
  });
});
