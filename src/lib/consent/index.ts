export {
  ADVERTISING_COOKIE_NAMES,
  CONSENT_COOKIE_NAME,
  CONSENT_COPY,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
} from "./constants";
export type {
  AdvertisingConsentStatus,
  ConsentDecision,
  ConsentRecord,
} from "./types";
export { isConsentRecord } from "./types";
export {
  clearAdvertisingCookies,
  hasAdvertisingConsent,
  parseConsentCookieValue,
  parseConsentPayload,
  readStoredConsent,
  writeStoredConsent,
} from "./storage";
