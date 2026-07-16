/**
 * First/last-touch acquisition attribution (campaign UTMs + ref).
 *
 * Model:
 * - FIRST TOUCH (amem_acq_first, 90d): first valid campaign origin; never overwritten.
 * - LAST TOUCH (amem_acq_last, 30d): most recent valid campaign; updates on new campaign URL.
 * - Direct navigation does not clear existing touches.
 *
 * Conversion merge into signup_intents (existing UTM columns — no migration):
 * explicit signup params > last touch > first touch > unattributed.
 * The intent row stores the chosen conversion attribution for this version;
 * first/last remain in cookies only.
 *
 * Cross-device without the cookie/link may appear as direct — acceptable limitation.
 * Email confirmation must not rely on UTMs in the URL (intent already holds them).
 */

export const ACQ_COOKIE_VERSION = 1 as const;

export const ACQ_FIRST_COOKIE = "amem_acq_first";
export const ACQ_LAST_COOKIE = "amem_acq_last";

/** 90 days */
export const ACQ_FIRST_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
/** 30 days */
export const ACQ_LAST_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const UTM_MAX_LEN = 120;
export const REF_MAX_LEN = 64;
export const LANDING_PATH_MAX_LEN = 200;

export type AcquisitionTouchV1 = {
  v: typeof ACQ_COOKIE_VERSION;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ref: string | null;
  landing_path: string | null;
  captured_at: string;
};

export type AcquisitionTouch = AcquisitionTouchV1;
