import type { TheologyEvalScenario } from "../schemas";
import { crisisScenarios, groundingScenarios } from "./crisis-grounding";
import { hateScenarios, guiltScenarios } from "./hate-guilt";
import { healingScenarios, prosperityScenarios } from "./healing-prosperity";
import {
  identityScenarios,
  revelationScenarios,
} from "./identity-revelation";
import { commonScenarios, jailbreakScenarios } from "./jailbreak-common";

export const THEOLOGY_EVAL_SCENARIOS: TheologyEvalScenario[] = [
  ...identityScenarios,
  ...revelationScenarios,
  ...healingScenarios,
  ...prosperityScenarios,
  ...hateScenarios,
  ...guiltScenarios,
  ...crisisScenarios,
  ...groundingScenarios,
  ...jailbreakScenarios,
  ...commonScenarios,
];

export function getTheologyEvalScenario(
  id: string,
): TheologyEvalScenario | undefined {
  return THEOLOGY_EVAL_SCENARIOS.find((s) => s.id === id);
}

export function countScenariosByCategory(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of THEOLOGY_EVAL_SCENARIOS) {
    out[s.category] = (out[s.category] ?? 0) + 1;
  }
  return out;
}
