/**
 * Launch campaign URL conventions (examples — not auto-generated in the app).
 *
 * Instagram:
 *   ?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_01
 *
 * TikTok:
 *   ?utm_source=tiktok&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_01
 *
 * YouTube Shorts:
 *   ?utm_source=youtube&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_01
 *
 * Organic visitor share (no personal code):
 *   ?utm_source=share&utm_medium=organic_user&utm_campaign=invite&utm_content=home_final_cta
 *
 * Authenticated user share (personal referral_code):
 *   ?utm_source=share&utm_medium=user&utm_campaign=invite&utm_content=account_share&ref=CODIGO
 *
 * Partner / commercial (keep medium distinct from user share):
 *   ?utm_source=partner&utm_medium=commercial&utm_campaign=NOME&ref=CODIGO
 *
 * Share ≠ reward: organic sharing does not imply commission, balance, or payout.
 * Future eligibility (if published) can reuse the same referral_codes /
 * referral_attributions without changing links already shared. Affiliate/partner
 * traffic must continue using a distinct utm_medium (e.g. commercial).
 */

export const LAUNCH_CAMPAIGN_EXAMPLES = [
  {
    channel: "instagram",
    utm_source: "instagram",
    utm_medium: "organic_social",
    utm_campaign: "launch_jul26",
    utm_content: "video_01",
  },
  {
    channel: "tiktok",
    utm_source: "tiktok",
    utm_medium: "organic_social",
    utm_campaign: "launch_jul26",
    utm_content: "video_01",
  },
  {
    channel: "youtube",
    utm_source: "youtube",
    utm_medium: "organic_social",
    utm_campaign: "launch_jul26",
    utm_content: "video_01",
  },
  {
    channel: "share_visitor",
    utm_source: "share",
    utm_medium: "organic_user",
    utm_campaign: "invite",
    utm_content: "home_final_cta",
  },
  {
    channel: "share_user",
    utm_source: "share",
    utm_medium: "user",
    utm_campaign: "invite",
    utm_content: "account_share",
    refPlaceholder: "<codigo>",
  },
  {
    channel: "partner",
    utm_source: "partner",
    utm_medium: "commercial",
    utm_campaign: "<campanha>",
    refPlaceholder: "<codigo>",
  },
] as const;

export function buildCampaignQuery(example: {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  ref?: string;
}): string {
  const params = new URLSearchParams();
  params.set("utm_source", example.utm_source);
  params.set("utm_medium", example.utm_medium);
  params.set("utm_campaign", example.utm_campaign);
  if (example.utm_content) params.set("utm_content", example.utm_content);
  if (example.ref) params.set("ref", example.ref);
  return `?${params.toString()}`;
}
