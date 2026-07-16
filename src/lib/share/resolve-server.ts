import "server-only";

import { getAppUrl, getCanonicalSiteUrl } from "@/lib/auth/app-url";
import { ensureReferralCodeForUser } from "@/lib/referrals";
import {
  buildOrganicShareUrl,
  type ShareUtmContent,
} from "@/lib/share";

function shareOrigin(): string {
  return getAppUrl() || getCanonicalSiteUrl();
}

/** Visitor / fallback share URL (no personal ref). */
export function buildVisitorShareUrl(content: ShareUtmContent): string {
  return buildOrganicShareUrl({
    origin: shareOrigin(),
    content,
  });
}

/**
 * Authenticated share URL with referral_code when available.
 * Creation failures fall back to the visitor link without breaking the page.
 */
export async function resolveUserShareUrl(
  userId: string,
  content: ShareUtmContent,
): Promise<string> {
  const code = await ensureReferralCodeForUser(userId);
  return buildOrganicShareUrl({
    origin: shareOrigin(),
    content,
    referralCode: code,
  });
}
