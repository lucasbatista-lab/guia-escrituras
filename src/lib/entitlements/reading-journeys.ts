import type { PlanKey } from "./types";
import { resolveEntitlements } from "./resolve";

/** Guided reading journeys — Caminho, Profundo and Particular. */
export function canUseReadingJourneys(
  planKey: PlanKey | null | undefined,
): boolean {
  if (!planKey) return false;
  return resolveEntitlements({ planKey }).has("reading_journeys");
}

export const READING_JOURNEYS_NOT_ENTITLED_MESSAGE =
  "Jornadas de leitura guiadas estão disponíveis nos planos Caminho, Profundo e Particular.";

/**
 * Explicit FREE/Essencial preview: open + complete day one only.
 * Does NOT grant `reading_journeys` — days 2+ stay soft-paywalled at Caminho.
 */
export const JOURNEY_PREVIEW_STEP_NUMBER = 1;

export function isJourneyPreviewStep(stepNumber: number): boolean {
  return stepNumber === JOURNEY_PREVIEW_STEP_NUMBER;
}

/** Full journey access, or the single interactive preview day. */
export function canAccessJourneyStep(
  planKey: PlanKey | null | undefined,
  stepNumber: number,
): boolean {
  if (canUseReadingJourneys(planKey)) return true;
  return isJourneyPreviewStep(stepNumber);
}
