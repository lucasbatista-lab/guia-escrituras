import { REF_MAX_LEN } from "@/lib/acquisition/types";
import { buildCampaignQuery } from "@/lib/acquisition/campaigns";
import {
  assertShareUtmContent,
  type ShareUtmContent,
} from "./origins";

/**
 * Organic share URLs.
 *
 * Visitor (no referral):
 *   utm_source=share&utm_medium=organic_user&utm_campaign=invite&utm_content=<origin>
 *
 * Authenticated with referral_code:
 *   utm_source=share&utm_medium=user&utm_campaign=invite&utm_content=<origin>&ref=<code>
 *
 * Never put user_id or e-mail in the URL. Invalid/missing codes fall back to
 * the visitor (organic_user) shape so the page never breaks.
 *
 * Future reward eligibility is independent of these links: the same referral_code
 * already flows into referral_attributions; sharing itself does not imply a reward.
 * Partner/affiliate traffic must keep distinct utm_medium (e.g. commercial).
 */

const REF_PATTERN = /^[A-Za-z0-9]+$/;

export function sanitizeReferralCodeForShare(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (
    trimmed.length < 2 ||
    trimmed.length > REF_MAX_LEN ||
    !REF_PATTERN.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

export function buildOrganicShareUrl(options: {
  origin: string;
  content: ShareUtmContent | string;
  referralCode?: string | null;
}): string {
  const content = assertShareUtmContent(options.content);
  const ref = sanitizeReferralCodeForShare(options.referralCode);
  const origin = options.origin.replace(/\/$/, "");

  const query = buildCampaignQuery({
    utm_source: "share",
    utm_medium: ref ? "user" : "organic_user",
    utm_campaign: "invite",
    utm_content: content,
    ...(ref ? { ref } : {}),
  });

  return `${origin}/${query}`;
}

/** True when the URL looks like a share invite (for admin/tests). */
export function isOrganicShareUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("utm_source") === "share" &&
      parsed.searchParams.get("utm_campaign") === "invite"
    );
  } catch {
    return false;
  }
}
