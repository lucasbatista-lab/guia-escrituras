/**
 * Allowed utm_content values for organic share CTAs.
 * Arbitrary content must not be accepted into share URLs.
 */
export const SHARE_UTM_CONTENTS = [
  "home_final_cta",
  "account_share",
  "subscription_success",
] as const;

export type ShareUtmContent = (typeof SHARE_UTM_CONTENTS)[number];

export function isShareUtmContent(value: string): value is ShareUtmContent {
  return (SHARE_UTM_CONTENTS as readonly string[]).includes(value);
}

export function assertShareUtmContent(value: string): ShareUtmContent {
  if (!isShareUtmContent(value)) {
    throw new Error("invalid_share_utm_content");
  }
  return value;
}
