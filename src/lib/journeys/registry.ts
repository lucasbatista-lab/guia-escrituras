import type { JourneySlug, ReadingJourney } from "./types";
import { validateReadingJourney } from "./content-safety";
import { ANSIEDADE_CONFIANCA_JOURNEY } from "./journeys/ansiedade-confianca";
import { PERDAO_LIMITES_JOURNEY } from "./journeys/perdao-limites";
import { RECOMECO_PROPOSITO_JOURNEY } from "./journeys/recomeco-proposito";

export const READING_JOURNEYS: ReadingJourney[] = [
  ANSIEDADE_CONFIANCA_JOURNEY,
  PERDAO_LIMITES_JOURNEY,
  RECOMECO_PROPOSITO_JOURNEY,
];

const BY_SLUG = new Map(READING_JOURNEYS.map((j) => [j.slug, j]));

for (const journey of READING_JOURNEYS) {
  const errors = validateReadingJourney(journey);
  if (errors.length > 0) {
    throw new Error(
      `Invalid journey registry (${journey.slug}): ${errors.join("; ")}`,
    );
  }
}

export function getAllJourneys(): ReadingJourney[] {
  return READING_JOURNEYS;
}

export function getJourneyBySlug(slug: string): ReadingJourney | undefined {
  return BY_SLUG.get(slug.trim());
}

export function isJourneySlug(slug: string): slug is JourneySlug {
  return BY_SLUG.has(slug.trim());
}

export function getJourneyStep(
  journeySlug: string,
  stepSlug: string,
): ReadingJourney["steps"][number] | undefined {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return undefined;
  return journey.steps.find((s) => s.slug === stepSlug.trim());
}

export function getJourneyStepById(
  journeySlug: string,
  stepId: string,
): ReadingJourney["steps"][number] | undefined {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return undefined;
  return journey.steps.find((s) => s.id === stepId.trim());
}

export function getJourneyStepIds(journeySlug: string): string[] {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return [];
  return journey.steps.map((s) => s.id);
}

export function getJourneyEstimatedMinutes(journey: ReadingJourney): number {
  return journey.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
}

export function getNextStepId(
  journeySlug: string,
  currentStepId: string,
): string | null {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return null;
  const idx = journey.steps.findIndex((s) => s.id === currentStepId);
  if (idx < 0 || idx >= journey.steps.length - 1) return null;
  return journey.steps[idx + 1]!.id;
}

export function getPreviousStepSlug(
  journeySlug: string,
  stepSlug: string,
): string | null {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return null;
  const idx = journey.steps.findIndex((s) => s.slug === stepSlug);
  if (idx <= 0) return null;
  return journey.steps[idx - 1]!.slug;
}

export function getNextStepSlug(
  journeySlug: string,
  stepSlug: string,
): string | null {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return null;
  const idx = journey.steps.findIndex((s) => s.slug === stepSlug);
  if (idx < 0 || idx >= journey.steps.length - 1) return null;
  return journey.steps[idx + 1]!.slug;
}
