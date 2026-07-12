import { describe, expect, it } from "vitest";
import { calculateTokenCost } from "@/lib/usage";

describe("calculateTokenCost", () => {
  it("computes deterministic micros and BRL cents", () => {
    const result = calculateTokenCost({
      model: "gpt-4.1-mini",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      usdBrlPlanningRate: 5.5,
    });

    // 400_000 + 1_600_000 = 2_000_000 micros = $2
    expect(result.estimatedCostUsdMicros).toBe(2_000_000);
    // $2 * 5.5 * 100 = 1100 cents
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
});
