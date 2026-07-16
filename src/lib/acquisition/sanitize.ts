import type { SignupTrackingParams } from "@/lib/signup-intents/types";
import {
  ACQ_COOKIE_VERSION,
  LANDING_PATH_MAX_LEN,
  REF_MAX_LEN,
  UTM_MAX_LEN,
  type AcquisitionTouch,
} from "./types";

export function sanitizeTrackingValue(
  raw: string | null | undefined,
  max: number,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().slice(0, max);
  if (!trimmed) return null;
  if ([...trimmed].some((ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127;
  })) {
    return null;
  }
  return trimmed;
}

/** Internal path only — no protocol, host, query, or fragment. */
export function sanitizeLandingPath(
  pathname: string | null | undefined,
): string | null {
  if (!pathname) return null;
  let path = pathname.trim();
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return null;
  if (path.includes("?") || path.includes("#")) {
    path = path.split(/[?#]/)[0] ?? path;
  }
  if (path.length > LANDING_PATH_MAX_LEN) {
    path = path.slice(0, LANDING_PATH_MAX_LEN);
  }
  return path || "/";
}

export function touchFromSearchParams(
  params: URLSearchParams,
  pathname: string,
  capturedAt = new Date().toISOString(),
): AcquisitionTouch | null {
  const touch: AcquisitionTouch = {
    v: ACQ_COOKIE_VERSION,
    utm_source: sanitizeTrackingValue(params.get("utm_source"), UTM_MAX_LEN),
    utm_medium: sanitizeTrackingValue(params.get("utm_medium"), UTM_MAX_LEN),
    utm_campaign: sanitizeTrackingValue(params.get("utm_campaign"), UTM_MAX_LEN),
    utm_content: sanitizeTrackingValue(params.get("utm_content"), UTM_MAX_LEN),
    utm_term: sanitizeTrackingValue(params.get("utm_term"), UTM_MAX_LEN),
    ref: sanitizeTrackingValue(params.get("ref"), REF_MAX_LEN),
    landing_path: sanitizeLandingPath(pathname),
    captured_at: capturedAt,
  };
  if (!hasCampaignSignal(touch)) return null;
  return touch;
}

export function hasCampaignSignal(
  touch:
    | Pick<
        AcquisitionTouch,
        | "utm_source"
        | "utm_medium"
        | "utm_campaign"
        | "utm_content"
        | "utm_term"
        | "ref"
      >
    | SignupTrackingParams
    | null
    | undefined,
): boolean {
  if (!touch) return false;
  if ("utmSource" in touch || "referralCode" in touch) {
    const t = touch as SignupTrackingParams;
    return Boolean(
      t.referralCode?.trim() ||
        t.utmSource?.trim() ||
        t.utmMedium?.trim() ||
        t.utmCampaign?.trim() ||
        t.utmContent?.trim() ||
        t.utmTerm?.trim(),
    );
  }
  const a = touch as AcquisitionTouch;
  return Boolean(
    a.utm_source ||
      a.utm_medium ||
      a.utm_campaign ||
      a.utm_content ||
      a.utm_term ||
      a.ref,
  );
}

export function touchToSignupTracking(
  touch: AcquisitionTouch | null,
): SignupTrackingParams {
  if (!touch) return {};
  return {
    referralCode: touch.ref,
    utmSource: touch.utm_source,
    utmMedium: touch.utm_medium,
    utmCampaign: touch.utm_campaign,
    utmContent: touch.utm_content,
    utmTerm: touch.utm_term,
  };
}

/**
 * Conversion attribution: explicit signup params > last touch > first touch.
 */
export function mergeConversionTracking(
  explicit: SignupTrackingParams | null | undefined,
  last: AcquisitionTouch | null,
  first: AcquisitionTouch | null,
): SignupTrackingParams {
  const fromFirst = touchToSignupTracking(first);
  const fromLast = touchToSignupTracking(last);
  const fromExplicit: SignupTrackingParams = {
    referralCode: sanitizeTrackingValue(explicit?.referralCode, REF_MAX_LEN),
    utmSource: sanitizeTrackingValue(explicit?.utmSource, UTM_MAX_LEN),
    utmMedium: sanitizeTrackingValue(explicit?.utmMedium, UTM_MAX_LEN),
    utmCampaign: sanitizeTrackingValue(explicit?.utmCampaign, UTM_MAX_LEN),
    utmContent: sanitizeTrackingValue(explicit?.utmContent, UTM_MAX_LEN),
    utmTerm: sanitizeTrackingValue(explicit?.utmTerm, UTM_MAX_LEN),
  };

  const pick = (
    a: string | null | undefined,
    b: string | null | undefined,
    c: string | null | undefined,
  ) => a?.trim() || b?.trim() || c?.trim() || null;

  return {
    referralCode: pick(
      fromExplicit.referralCode,
      fromLast.referralCode,
      fromFirst.referralCode,
    ),
    utmSource: pick(
      fromExplicit.utmSource,
      fromLast.utmSource,
      fromFirst.utmSource,
    ),
    utmMedium: pick(
      fromExplicit.utmMedium,
      fromLast.utmMedium,
      fromFirst.utmMedium,
    ),
    utmCampaign: pick(
      fromExplicit.utmCampaign,
      fromLast.utmCampaign,
      fromFirst.utmCampaign,
    ),
    utmContent: pick(
      fromExplicit.utmContent,
      fromLast.utmContent,
      fromFirst.utmContent,
    ),
    utmTerm: pick(fromExplicit.utmTerm, fromLast.utmTerm, fromFirst.utmTerm),
  };
}

export function parseAcquisitionCookie(
  raw: string | null | undefined,
): AcquisitionTouch | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.v !== ACQ_COOKIE_VERSION) return null;
    if (typeof obj.captured_at !== "string" || !obj.captured_at) return null;
    const touch: AcquisitionTouch = {
      v: ACQ_COOKIE_VERSION,
      utm_source: sanitizeTrackingValue(
        typeof obj.utm_source === "string" ? obj.utm_source : null,
        UTM_MAX_LEN,
      ),
      utm_medium: sanitizeTrackingValue(
        typeof obj.utm_medium === "string" ? obj.utm_medium : null,
        UTM_MAX_LEN,
      ),
      utm_campaign: sanitizeTrackingValue(
        typeof obj.utm_campaign === "string" ? obj.utm_campaign : null,
        UTM_MAX_LEN,
      ),
      utm_content: sanitizeTrackingValue(
        typeof obj.utm_content === "string" ? obj.utm_content : null,
        UTM_MAX_LEN,
      ),
      utm_term: sanitizeTrackingValue(
        typeof obj.utm_term === "string" ? obj.utm_term : null,
        UTM_MAX_LEN,
      ),
      ref: sanitizeTrackingValue(
        typeof obj.ref === "string" ? obj.ref : null,
        REF_MAX_LEN,
      ),
      landing_path: sanitizeLandingPath(
        typeof obj.landing_path === "string" ? obj.landing_path : null,
      ),
      captured_at: obj.captured_at,
    };
    if (!hasCampaignSignal(touch)) return null;
    return touch;
  } catch {
    return null;
  }
}

export function serializeAcquisitionCookie(touch: AcquisitionTouch): string {
  return encodeURIComponent(JSON.stringify(touch));
}
