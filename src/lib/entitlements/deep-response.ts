import type { PlanKey } from "./types";
import { resolveEntitlements } from "./resolve";

/**
 * On-demand deep response capability (preferDeep / chat_deep).
 * Distinct from profile preferredDepth — that only shapes ordinary replies.
 */
export function canUseDeepResponseOnDemand(
  planKey: PlanKey | null | undefined,
): boolean {
  if (!planKey) return false;
  return resolveEntitlements({ planKey }).has("chat_deep");
}

export const DEEP_RESPONSE_NOT_ENTITLED_MESSAGE =
  "A resposta aprofundada sob demanda está disponível no plano Profundo.";
