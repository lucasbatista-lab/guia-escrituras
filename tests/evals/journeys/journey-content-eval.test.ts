import { describe, expect, it } from "vitest";
import { evaluateJourneyEditorialContent } from "@/lib/evals/theology/journey-content-eval";

describe("theology journeys editorial eval", () => {
  it("passes all 21 steps offline", () => {
    const result = evaluateJourneyEditorialContent();
    expect(result.journeysEvaluated).toBe(3);
    expect(result.stepsEvaluated).toBe(21);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.severity === "critical")).toEqual([]);
  });
});
