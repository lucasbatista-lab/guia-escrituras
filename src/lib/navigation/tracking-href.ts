import type { SignupTrackingParams } from "@/lib/signup-intents/types";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

type TrackingInput =
  | SignupTrackingParams
  | Record<string, string | null | undefined>
  | null
  | undefined;

function pick(
  tracking: NonNullable<TrackingInput>,
  camel: keyof SignupTrackingParams,
  snake: string,
): string | null | undefined {
  if (camel in tracking) {
    return (tracking as SignupTrackingParams)[camel];
  }
  return (tracking as Record<string, string | null | undefined>)[snake];
}

/** Merge current tracking into a relative href without dropping existing query. */
export function withTrackingParams(
  href: string,
  tracking: TrackingInput,
): string {
  if (!tracking) return href;
  const url = new URL(href, "https://amem.local");
  const entries: Array<[string, string | null | undefined]> = [
    ["ref", pick(tracking, "referralCode", "ref")],
    ["utm_source", pick(tracking, "utmSource", "utm_source")],
    ["utm_medium", pick(tracking, "utmMedium", "utm_medium")],
    ["utm_campaign", pick(tracking, "utmCampaign", "utm_campaign")],
    ["utm_content", pick(tracking, "utmContent", "utm_content")],
    ["utm_term", pick(tracking, "utmTerm", "utm_term")],
  ];

  for (const [key, value] of entries) {
    if (value?.trim()) url.searchParams.set(key, value.trim().slice(0, 120));
  }

  return `${url.pathname}${url.search}`;
}

/** Extract tracking from Next.js searchParams record. */
export function trackingFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value?.trim()) out[key] = value.trim().slice(0, 120);
  }
  return out;
}
