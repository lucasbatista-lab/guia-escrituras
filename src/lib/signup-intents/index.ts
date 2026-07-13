export type {
  SignupIntentRecord,
  SignupIntentStatus,
  SignupTrackingParams,
  CreateSignupIntentInput,
} from "./types";
export {
  generateSignupIntentToken,
  hashSignupIntentToken,
  isSignupIntentExpired,
  signupIntentExpiresAt,
  SIGNUP_INTENT_TTL_HOURS,
} from "./tokens";
export {
  validateCheckoutPlan,
  parseSignupSearchParams,
  buildCadastroHref,
  isCheckoutPlanKey,
} from "./params";
export {
  createSignupIntentWithToken,
  getAuthCallbackUrlForIntent,
  loadSignupIntentByToken,
  markIntentAwaitingConfirmation,
  completeIntentAfterConfirmation,
  getContinuationViewState,
  assertSignupIntentBackendConfigured,
  SignupIntentConfigError,
  type ContinuationViewState,
} from "./service";
export {
  getSignupIntentRepository,
  setSignupIntentRepositoryForTests,
} from "./repository";
