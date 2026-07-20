import { describe, expect, it } from "vitest";
import { runTheologyEval } from "@/lib/evals/theology";

/**
 * CLI entry used by `pnpm eval:theology` / `pnpm eval:theology:ci`.
 * Writes reports only in full mode; CI asserts fixture contract.
 */
describe("theology eval CLI", () => {
  it("executes requested mode", async () => {
    const mode = process.env.THEOLOGY_EVAL_CLI === "ci" ? "ci" : "full";
    const outcome = await runTheologyEval({
      mode,
      writeReports: true,
      outputDir: `${process.cwd().replace(/\\/g, "/")}/tmp/theology-evals`,
    });

    expect(outcome.fixtureContractOk).toBe(true);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.jsonPath).toBeTruthy();
    expect(outcome.markdownPath).toBeTruthy();

    if (mode === "full") {
      expect(outcome.report.byMode.offline_mock.total).toBeGreaterThan(0);
    } else {
      expect(outcome.report.byMode.offline_mock.total).toBe(0);
    }
  }, 120_000);
});
