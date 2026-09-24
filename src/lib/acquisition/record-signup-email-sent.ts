import "server-only";

import { persistPublicConversionEvent } from "@/lib/acquisition/public-events-persist";
import type { ViewportClass } from "@/lib/acquisition/public-event-types";
import type { SignupTrackingParams } from "@/lib/signup-intents";

/**
 * Fire once when Supabase accepted a NEW signup that requires email confirmation.
 * Never include email/name/tokens. Fail-open.
 *
 * event_id is derived from requestId so retries of the same action do not double-count.
 */
export async function recordSignupEmailSent(params: {
  requestId: string;
  tracking?: SignupTrackingParams | null;
  viewportClass?: ViewportClass | null;
}): Promise<void> {
  const opaque = params.requestId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
  if (opaque.length < 8) return;

  await persistPublicConversionEvent({
    eventId: `ses_${opaque}`,
    sessionKey: `srv_${opaque}`,
    event: "signup_email_sent",
    path: "/confira-seu-email",
    utm_source: params.tracking?.utmSource ?? null,
    utm_medium: params.tracking?.utmMedium ?? null,
    utm_campaign: params.tracking?.utmCampaign ?? null,
    utm_content: params.tracking?.utmContent ?? null,
    viewport_class: params.viewportClass ?? "mobile",
  });
}
