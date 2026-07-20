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
