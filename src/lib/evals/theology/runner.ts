import { evaluateFixture } from "./evaluate";
import { runOfflineMockPipeline } from "./pipeline-offline";
import {
  aggregateTheologyResults,
  printTheologyReportSummary,
  writeTheologyReports,
} from "./report";
import { THEOLOGY_EVAL_SCENARIOS } from "./scenarios";
import type { TheologyEvalReport, TheologyEvalResult } from "./schemas";

export type TheologyEvalRunOptions = {
  /** full = fixtures + offline mock pipeline; ci = fixtures only (deterministic gates) */
  mode: "full" | "ci";
  /** When true, also run offline mock pipeline in ci mode (default false). */
  includeOfflineMock?: boolean;
  outputDir?: string;
  writeReports?: boolean;
};

export type TheologyEvalRunOutcome = {
  report: TheologyEvalReport;
  /** CI fails when any intended-pass fixture fails or intended-fail fixture passes. */
  fixtureContractOk: boolean;
  fixtureContractFailures: string[];
  jsonPath?: string;
  markdownPath?: string;
  exitCode: number;
};

function assertFixtureContract(results: TheologyEvalResult[]): {
  ok: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  for (const result of results) {
    if (result.mode !== "fixture" || !result.fixtureId) continue;
    const scenario = THEOLOGY_EVAL_SCENARIOS.find((s) => s.id === result.scenarioId);
    const fixture = scenario?.fixtures.find((f) => f.id === result.fixtureId);
    if (!fixture) continue;
    if (fixture.intendedPass && !result.pass) {
      failures.push(
        `${result.scenarioId}/${result.fixtureId}: resposta segura rejeitada`,
      );
    }
    if (!fixture.intendedPass && result.pass) {
      failures.push(
        `${result.scenarioId}/${result.fixtureId}: resposta insegura aceita`,
      );
    }
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Runs the offline theology harness. Never calls OpenAI or external networks.
 */
export async function runTheologyEval(
  options: TheologyEvalRunOptions,
): Promise<TheologyEvalRunOutcome> {
  const results: TheologyEvalResult[] = [];

  for (const scenario of THEOLOGY_EVAL_SCENARIOS) {
    for (const fixture of scenario.fixtures) {
      results.push(evaluateFixture(scenario, fixture));
    }
  }

  const runMock =
    options.mode === "full" || options.includeOfflineMock === true;
  if (runMock) {
    for (const scenario of THEOLOGY_EVAL_SCENARIOS) {
      results.push(await runOfflineMockPipeline(scenario));
    }
  }

  const report = aggregateTheologyResults({
    mode: options.mode,
    results,
    scenarioCount: THEOLOGY_EVAL_SCENARIOS.length,
  });

  const contract = assertFixtureContract(results);
  printTheologyReportSummary(report);

  let jsonPath: string | undefined;
  let markdownPath: string | undefined;
  if (options.writeReports !== false) {
    const outputDir =
      options.outputDir ??
      `${process.cwd().replace(/\\/g, "/")}/tmp/theology-evals`;
    const written = writeTheologyReports({ report, outputDir });
    jsonPath = written.jsonPath;
    markdownPath = written.markdownPath;
    // eslint-disable-next-line no-console
    console.log(`Report JSON: ${jsonPath}`);
    // eslint-disable-next-line no-console
    console.log(`Report Markdown: ${markdownPath}`);
  }

  if (!contract.ok) {
    // eslint-disable-next-line no-console
    console.error("Fixture contract failures:");
    for (const failure of contract.failures) {
      // eslint-disable-next-line no-console
      console.error(`  - ${failure}`);
    }
  }

  const exitCode = contract.ok ? 0 : 1;
  return {
    report,
    fixtureContractOk: contract.ok,
    fixtureContractFailures: contract.failures,
    jsonPath,
    markdownPath,
    exitCode,
  };
}
