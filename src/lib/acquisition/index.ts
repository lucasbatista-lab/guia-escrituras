export type { AcquisitionTouch, AcquisitionTouchV1 } from "./types";
export {
  ACQ_COOKIE_VERSION,
  ACQ_FIRST_COOKIE,
  ACQ_LAST_COOKIE,
  ACQ_FIRST_MAX_AGE_SECONDS,
  ACQ_LAST_MAX_AGE_SECONDS,
  UTM_MAX_LEN,
  REF_MAX_LEN,
  LANDING_PATH_MAX_LEN,
} from "./types";
export {
  sanitizeTrackingValue,
  sanitizeLandingPath,
  touchFromSearchParams,
  hasCampaignSignal,
  touchToSignupTracking,
  mergeConversionTracking,
  parseAcquisitionCookie,
  serializeAcquisitionCookie,
} from "./sanitize";
export { applyAcquisitionCapture } from "./capture";
export { resolveTrackingForSignupIntent } from "./resolve-for-signup";
export {
  LAUNCH_CAMPAIGN_EXAMPLES,
  buildCampaignQuery,
} from "./campaigns";
