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
  getAuthConfirmUrlForIntent,
  loadSignupIntentByToken,
  markIntentAwaitingConfirmation,
  associateIntentUserAwaitingConfirmation,
  findLatestActionableIntentByUserId,
  completeIntentAfterConfirmation,
  getContinuationViewState,
  getContinuationViewStateForUser,
  loadSignupIntentByIdForUser,
  assertSignupIntentBackendConfigured,
  SignupIntentConfigError,
  type ContinuationViewState,
} from "./service";
export {
  getSignupIntentRepository,
  setSignupIntentRepositoryForTests,
} from "./repository";
export {
  SIGNUP_INTENT_COOKIE,
  setSignupIntentCookie,
  readSignupIntentCookie,
  clearSignupIntentCookie,
  signupIntentCookieOptions,
} from "./continuity-cookie";
