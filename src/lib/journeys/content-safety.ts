import type { ReadingJourney, ReadingJourneyStep } from "./types";

/** Critical phrases that must not appear in editorial journey content. */
export const FORBIDDEN_JOURNEY_PHRASES = [
  /eu sou jesus/i,
  /sou deus/i,
  /deus me disse/i,
  /deus te disse/i,
  /revelaç[aã]o espec[ií]fica/i,
  /sinal de deus/i,
  /você será curad[oa]/i,
  /vai ser curad[oa]/i,
  /garanto que vai melhorar/i,
  /você vai prosperar/i,
  /plano secreto de deus/i,
  /deus quer que você fique/i,
  /perdoe e volte.*abuso/i,
] as const;

const LONG_LITERAL_QUOTE = /[“"][^”"]{120,}[”"]/;

function stepText(step: ReadingJourneyStep): string {
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

export function validateJourneyStepContent(step: ReadingJourneyStep): string[] {
  const errors: string[] = [];
  const text = stepText(step);

  if (!step.id.trim()) errors.push("missing id");
  if (!step.slug.trim()) errors.push("missing slug");
  if (!step.title.trim()) errors.push("missing title");
  if (!step.bibleReference.trim()) errors.push("missing bibleReference");
  if (!step.paraphrase.trim()) errors.push("missing paraphrase");
  if (!step.reflection.trim()) errors.push("missing reflection");
  if (!step.personalQuestion.trim()) errors.push("missing personalQuestion");
  if (!step.practicalAction.trim()) errors.push("missing practicalAction");
  if (step.estimatedMinutes < 1 || step.estimatedMinutes > 30) {
    errors.push("invalid estimatedMinutes");
  }
  if (LONG_LITERAL_QUOTE.test(text)) {
    errors.push("long literal quotation");
  }
  for (const pattern of FORBIDDEN_JOURNEY_PHRASES) {
    if (pattern.test(text)) {
      errors.push(`forbidden phrase: ${pattern.source}`);
    }
  }
  return errors;
}

export function validateReadingJourney(journey: ReadingJourney): string[] {
  const errors: string[] = [];
  if (!journey.slug.trim()) errors.push("missing slug");
  if (journey.steps.length !== 7) {
    errors.push(`expected 7 steps, got ${journey.steps.length}`);
  }
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const step of journey.steps) {
    if (ids.has(step.id)) errors.push(`duplicate id ${step.id}`);
    if (slugs.has(step.slug)) errors.push(`duplicate slug ${step.slug}`);
    ids.add(step.id);
    slugs.add(step.slug);
    errors.push(...validateJourneyStepContent(step).map((e) => `${step.id}: ${e}`));
  }
  return errors;
}
