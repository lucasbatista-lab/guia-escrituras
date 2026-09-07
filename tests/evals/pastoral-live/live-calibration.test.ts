import { describe, expect, it } from "vitest";
import {
  assertPastoralLiveCaseBalance,
  PASTORAL_LIVE_CASES,
  runPastoralLiveCalibration,
} from "@/lib/evals/pastoral-live";

/**
 * Opt-in only. Invoked by `pnpm eval:pastoral-live`.
 * Default `pnpm test` skips this suite.
 */
describe("live pastoral calibration", () => {
  it("keeps a balanced 36-case matrix", () => {
    assertPastoralLiveCaseBalance(PASTORAL_LIVE_CASES);
    expect(PASTORAL_LIVE_CASES).toHaveLength(36);
  });

  it("runs production pipeline live when explicitly enabled", async () => {
    if (process.env.LIVE_PASTORAL_CALIBRATION !== "1") {
      return;
    }
    if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
      throw new Error("must not run in CI");
    }
    const report = await runPastoralLiveCalibration({
      outputDir: `${process.cwd().replace(/\\/g, "/")}/tmp/pastoral-live-calibration`,
      concurrency: 2,
    });
    expect(report.caseCount).toBe(36);
    expect(report.exitCode).toBeTypeOf("number");
  }, 1_800_000);
});
