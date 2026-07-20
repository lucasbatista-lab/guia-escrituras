import { describe, expect, it } from "vitest";
import {
  THEOLOGY_EVAL_SCENARIOS,
  countScenariosByCategory,
  evaluateFixture,
  theologyEvalScenarioSchema,
  theologyEvalReportSchema,
  aggregateTheologyResults,
  renderTheologyReportMarkdown,
  runTheologyEval,
  runOfflineMockPipeline,
} from "@/lib/evals/theology";

describe("theology eval scenarios corpus", () => {
  it("has at least 48 carefully written scenarios", () => {
    expect(THEOLOGY_EVAL_SCENARIOS.length).toBeGreaterThanOrEqual(48);
  });

  it("covers all required categories with balance", () => {
    const counts = countScenariosByCategory();
    for (const key of [
      "identity",
      "revelation",
      "healing",
      "prosperity",
      "hate_exclusion",
      "guilt_forgiveness",
      "mental_health_crisis",
      "grounding",
      "jailbreak",
      "common_situations",
    ]) {
      expect(counts[key] ?? 0).toBeGreaterThanOrEqual(4);
    }
  });

  it("parses every scenario through zod", () => {
    for (const scenario of THEOLOGY_EVAL_SCENARIOS) {
      expect(() => theologyEvalScenarioSchema.parse(scenario)).not.toThrow();
      expect(scenario.fixtures.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("fixture contract", () => {
  it("accepts safe fixtures and rejects unsafe fixtures", () => {
    for (const scenario of THEOLOGY_EVAL_SCENARIOS) {
      for (const fixture of scenario.fixtures) {
        const result = evaluateFixture(scenario, fixture);
        if (fixture.intendedPass) {
          expect(result.pass, `${scenario.id}/${fixture.id} should pass`).toBe(
            true,
          );
        } else {
          expect(result.pass, `${scenario.id}/${fixture.id} should fail`).toBe(
            false,
          );
        }
      }
    }
  });
});

describe("offline mock pipeline", () => {
  it("runs without network and labels provider as mock", async () => {
    const sample = THEOLOGY_EVAL_SCENARIOS[0]!;
    const result = await runOfflineMockPipeline(sample);
    expect(result.mode).toBe("offline_mock");
    expect(result.providerLabel).toContain("mock");
    expect(result.pass).toBe(true);
  });
});

describe("reports", () => {
  it("builds JSON-compatible report and markdown without secrets", async () => {
    const fixtureResults = THEOLOGY_EVAL_SCENARIOS.flatMap((scenario) =>
      scenario.fixtures.map((fixture) => evaluateFixture(scenario, fixture)),
    );
    const report = aggregateTheologyResults({
      mode: "ci",
      results: fixtureResults,
      scenarioCount: THEOLOGY_EVAL_SCENARIOS.length,
    });
    expect(() => theologyEvalReportSchema.parse(report)).not.toThrow();
    const md = renderTheologyReportMarkdown(report);
    expect(md).toContain("Theology & Safety Evaluation Report");
    expect(md).not.toMatch(/sk-[a-z0-9]{10,}/i);
    expect(md).not.toMatch(/whsec_/i);
    expect(report.providerNote).toContain("Offline/mock");
  });
});

describe("CI runner exit contract", () => {
  it("returns exitCode 0 for deterministic fixture suite", async () => {
    const outcome = await runTheologyEval({
      mode: "ci",
      writeReports: false,
    });
    expect(outcome.fixtureContractOk).toBe(true);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.fixtureContractFailures).toEqual([]);
  });
});
