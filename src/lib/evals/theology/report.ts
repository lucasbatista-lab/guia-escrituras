import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATEGORY_LABELS, RULE_LABELS } from "./rubric";
import type { TheologyEvalReport, TheologyEvalResult } from "./schemas";
import { theologyEvalReportSchema } from "./schemas";

function emptyMode() {
  return { total: 0, passed: 0, failed: 0 };
}

export function aggregateTheologyResults(input: {
  mode: "full" | "ci";
  results: TheologyEvalResult[];
  scenarioCount: number;
}): TheologyEvalReport {
  const byCategory: TheologyEvalReport["byCategory"] = {};
  const byMode = {
    fixture: emptyMode(),
    offline_mock: emptyMode(),
  };
  const ruleFail = new Map<string, number>();
  const dimensionSum = new Map<string, { sum: number; n: number }>();

  let passed = 0;
  let failed = 0;
  let criticalFailures = 0;
  const critical: TheologyEvalResult[] = [];

  for (const result of input.results) {
    const cat = byCategory[result.category] ?? {
      total: 0,
      passed: 0,
      failed: 0,
    };
    cat.total += 1;
    if (result.pass) {
      passed += 1;
      cat.passed += 1;
      byMode[result.mode].passed += 1;
    } else {
      failed += 1;
      cat.failed += 1;
      byMode[result.mode].failed += 1;
    }
    byMode[result.mode].total += 1;
    byCategory[result.category] = cat;

    if (result.criticalFailure || !result.pass) {
      if (result.criticalFailure) {
        criticalFailures += 1;
        critical.push(result);
      }
    }

    for (const rule of result.rules) {
      if (!rule.passed) {
        ruleFail.set(rule.ruleId, (ruleFail.get(rule.ruleId) ?? 0) + 1);
      }
    }
    for (const dim of result.dimensionScores) {
      const cur = dimensionSum.get(dim.dimension) ?? { sum: 0, n: 0 };
      cur.sum += dim.score;
      cur.n += 1;
      dimensionSum.set(dim.dimension, cur);
    }
  }

  const topTriggeredRules = [...ruleFail.entries()]
    .map(([ruleId, failCount]) => ({ ruleId, failCount }))
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 12);

  const dimensionAverages: Record<string, number> = {};
  for (const [key, value] of dimensionSum) {
    dimensionAverages[key] = Number((value.sum / value.n).toFixed(3));
  }

  const pipelineGaps = [
    "MockAiProvider é deliberadamente seguro — resultados offline_mock não medem a qualidade da OpenAI live.",
    "assertSafeAiIdentity no path OpenAI cobre regex estreita; fixtures inseguras mostram gaps que o live ainda não bloqueia por código.",
    "Filtro de biblicalReferences não varre citações no texto livre da answer.",
    "Prompt menciona 'fluxo seguro' de crise, mas não há implementação no chat live (avaliado só no harness).",
    "Regras de ódio/prosperidade/cura são majoritariamente prompt-only no produto atual.",
  ];

  const nextActions = [
    "Manter eval:theology:ci no hábito pré-merge de mudanças teológicas.",
    "Após smoke de lançamento, considerar Output Safety Guards V1 (sem ligar ao chat neste bloco).",
    "Planejar fluxo de crise com revisão humana antes de alterar /api/chat.",
    "Expandir corpus de fixtures quando novos modos de falha aparecerem em produção.",
  ];

  return theologyEvalReportSchema.parse({
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    providerNote: "Offline/mock — does not measure live OpenAI quality.",
    totals: {
      scenarios: input.scenarioCount,
      evaluations: input.results.length,
      passed,
      failed,
      criticalFailures,
    },
    byCategory,
    byMode,
    topTriggeredRules,
    dimensionAverages,
    criticalFailures: critical.slice(0, 40),
    pipelineGaps,
    nextActions,
    results: input.results,
  });
}

export function renderTheologyReportMarkdown(report: TheologyEvalReport): string {
  const lines: string[] = [
    "# Theology & Safety Evaluation Report",
    "",
    `Gerado em: ${report.generatedAt}`,
    `Modo: **${report.mode}**`,
    "",
    `> ${report.providerNote}`,
    "",
    "## Resumo",
    "",
    `| Métrica | Valor |`,
    `|--------|------:|`,
    `| Cenários | ${report.totals.scenarios} |`,
    `| Avaliações | ${report.totals.evaluations} |`,
    `| Pass | ${report.totals.passed} |`,
    `| Fail | ${report.totals.failed} |`,
    `| Falhas críticas | ${report.totals.criticalFailures} |`,
    "",
    "## Por modo",
    "",
    `| Modo | Total | Pass | Fail |`,
    `|------|------:|-----:|-----:|`,
    `| fixture | ${report.byMode.fixture.total} | ${report.byMode.fixture.passed} | ${report.byMode.fixture.failed} |`,
    `| offline_mock | ${report.byMode.offline_mock.total} | ${report.byMode.offline_mock.passed} | ${report.byMode.offline_mock.failed} |`,
    "",
    "## Por categoria",
    "",
    `| Categoria | Total | Pass | Fail |`,
    `|-----------|------:|-----:|-----:|`,
  ];

  for (const [key, value] of Object.entries(report.byCategory)) {
    lines.push(
      `| ${CATEGORY_LABELS[key] ?? key} | ${value.total} | ${value.passed} | ${value.failed} |`,
    );
  }

  lines.push("", "## Regras mais acionadas (falhas)", "");
  if (report.topTriggeredRules.length === 0) {
    lines.push("_Nenhuma falha de regra nesta execução._", "");
  } else {
    lines.push(`| Regra | Falhas |`, `|-------|-------:|`);
    for (const row of report.topTriggeredRules) {
      lines.push(
        `| ${RULE_LABELS[row.ruleId as keyof typeof RULE_LABELS] ?? row.ruleId} | ${row.failCount} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Scores médios por dimensão", "");
  for (const [key, value] of Object.entries(report.dimensionAverages)) {
    lines.push(`- ${RULE_LABELS[key as keyof typeof RULE_LABELS] ?? key}: ${value}`);
  }

  lines.push("", "## Falhas críticas (amostra)", "");
  if (report.criticalFailures.length === 0) {
    lines.push("_Nenhuma._", "");
  } else {
    for (const fail of report.criticalFailures.slice(0, 15)) {
      const failedRules = fail.rules
        .filter((r) => !r.passed && r.critical)
        .map((r) => r.ruleId)
        .join(", ");
      lines.push(
        `- **${fail.scenarioId}** (${fail.mode}${fail.fixtureId ? `/${fail.fixtureId}` : ""}): ${failedRules}`,
      );
      lines.push(`  - trecho: ${fail.answerExcerpt.slice(0, 120)}…`);
    }
    lines.push("");
  }

  lines.push("## Gaps do pipeline atual", "");
  for (const gap of report.pipelineGaps) {
    lines.push(`- ${gap}`);
  }

  lines.push("", "## Próximas ações", "");
  for (const action of report.nextActions) {
    lines.push(`- ${action}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function writeTheologyReports(input: {
  report: TheologyEvalReport;
  outputDir: string;
}): { jsonPath: string; markdownPath: string } {
  mkdirSync(input.outputDir, { recursive: true });
  const stamp = input.report.generatedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(input.outputDir, `theology-eval-${stamp}.json`);
  const markdownPath = path.join(input.outputDir, `theology-eval-${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(input.report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderTheologyReportMarkdown(input.report), "utf8");
  return { jsonPath, markdownPath };
}

export function printTheologyReportSummary(report: TheologyEvalReport): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "Theology eval summary",
      `  scenarios: ${report.totals.scenarios}`,
      `  evaluations: ${report.totals.evaluations}`,
      `  pass: ${report.totals.passed}`,
      `  fail: ${report.totals.failed}`,
      `  criticalFailures: ${report.totals.criticalFailures}`,
      `  fixture: ${report.byMode.fixture.passed}/${report.byMode.fixture.total} pass`,
      `  offline_mock: ${report.byMode.offline_mock.passed}/${report.byMode.offline_mock.total} pass`,
      "",
    ].join("\n"),
  );
}
