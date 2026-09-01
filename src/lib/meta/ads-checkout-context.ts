/**
 * Non-financial advertising context for Stripe Checkout Session metadata + CAPI.
 * Shared types (safe for client). Sanitization happens server-side.
 */

export type AdsCheckoutContext = {
  advertisingConsent: boolean;
  eventSourceUrl: string | null;
  fbp: string | null;
  fbc: string | null;
  /** Stable InitiateCheckout event id generated client-side when consented. */
  eventId: string | null;
};

export const META_SESSION_META = {
  consent: "meta_ads_consent",
  eventSourceUrl: "meta_event_source_url",
  fbp: "meta_fbp",
  fbc: "meta_fbc",
  initiateEventId: "meta_initiate_checkout_event_id",
  clientIp: "meta_client_ip",
  clientUa: "meta_client_ua",
} as const;
