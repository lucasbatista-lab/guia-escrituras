export type { CrisisCategory, CrisisDetectionResult, CrisisMatch } from "./types";
export { detectCrisisMessage, normalizeCrisisText } from "./detect";
export {
  buildCrisisAnswer,
  CRISIS_INTERPRETATION_NOTICE,
  CRISIS_LOCALE,
  CRISIS_RESOURCES_BR,
} from "./locale-br";
