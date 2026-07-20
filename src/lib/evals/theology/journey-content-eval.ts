import { getAllJourneys } from "@/lib/journeys/registry";
import {
  detectAffirmativeRevelation,
  detectDivinePersonification,
  detectGuaranteedHealing,
  detectGuaranteedProsperity,
  detectHateOrExclusion,
  detectSpiritualFearManipulation,
  detectFalseLiteralCitation,
} from "@/lib/evals/theology/detectors";
import {
  FORBIDDEN_JOURNEY_PHRASES,
  validateReadingJourney,
} from "@/lib/journeys/content-safety";
import type { ReadingJourneyStep } from "@/lib/journeys/types";

export type JourneyContentEvalIssue = {
  journeySlug: string;
  stepId: string;
  severity: "critical" | "warning";
  rule: string;
  detail: string;
};

function stepCorpus(step: ReadingJourneyStep): string {
  return [
    step.title,
    step.objective,
    step.paraphrase,
    step.reflection,
    step.personalQuestion,
    step.practicalAction,
    step.safetyNote ?? "",
    step.chatSuggestion ?? "",
  ].join("\n");
}

export function evaluateJourneyEditorialContent(): {
  ok: boolean;
  issues: JourneyContentEvalIssue[];
  stepsEvaluated: number;
  journeysEvaluated: number;
} {
  const journeys = getAllJourneys();
  const issues: JourneyContentEvalIssue[] = [];

  for (const journey of journeys) {
    const schemaErrors = validateReadingJourney(journey);
    for (const err of schemaErrors) {
      issues.push({
        journeySlug: journey.slug,
        stepId: "journey",
        severity: "critical",
        rule: "schema",
        detail: err,
      });
    }

    for (const step of journey.steps) {
      const text = stepCorpus(step);
      const push = (
        rule: string,
        detail: string,
        severity: JourneyContentEvalIssue["severity"] = "critical",
      ) => {
        issues.push({
          journeySlug: journey.slug,
          stepId: step.id,
          severity,
          rule,
          detail,
        });
      };

      if (detectDivinePersonification(text)) {
        push("identity", "divine personification");
      }
      if (detectAffirmativeRevelation(text)) {
        push("revelation", "affirmative revelation");
      }
      if (detectGuaranteedHealing(text)) {
        push("healing", "guaranteed healing");
      }
      if (detectGuaranteedProsperity(text)) {
        push("prosperity", "guaranteed prosperity");
      }
      if (detectHateOrExclusion(text)) {
        push("exclusion", "hate or exclusion");
      }
      if (detectSpiritualFearManipulation(text)) {
        push("manipulation", "spiritual fear manipulation");
      }
      if (detectFalseLiteralCitation(text)) {
        push("literal_citation", "suspected false literal citation", "warning");
      }
      for (const pattern of FORBIDDEN_JOURNEY_PHRASES) {
        if (pattern.test(text)) {
          push("forbidden_phrase", pattern.source);
        }
      }
    }
  }

  const critical = issues.filter((i) => i.severity === "critical");
  return {
    ok: critical.length === 0,
    issues,
    stepsEvaluated: journeys.reduce((n, j) => n + j.steps.length, 0),
    journeysEvaluated: journeys.length,
  };
}
