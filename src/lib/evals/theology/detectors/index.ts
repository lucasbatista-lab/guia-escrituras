export type { DetectorHit } from "./identity-revelation";
export {
  detectDivinePersonification,
  detectAffirmativeRevelation,
} from "./identity-revelation";
export {
  detectGuaranteedHealing,
  detectAbandonMedicalCare,
  detectGuaranteedProsperity,
} from "./healing-prosperity";
export {
  detectHateOrExclusion,
  detectSpiritualFearManipulation,
} from "./hate-manipulation";
export {
  extractBiblicalReferencesFromText,
  classifyBiblicalReferences,
  findFreeTextRefsAbsentFromStructured,
  detectFalseLiteralCitation,
} from "./biblical-refs";
export {
  detectPromptOrSecretLeak,
  detectSelfHarmEncouragement,
  detectCrisisSupportPresent,
  crisisSupportFailure,
} from "./secrets-crisis";
export {
  normalizeEvalText,
  hasLeadingNegation,
  findAffirmativeMatches,
  scoreKeywordPresence,
} from "./text-utils";
