"use client";

import { createMetaEventId } from "./browser-events";
import { trackMetaBrowserEvent } from "./pixel-loader";
import { hasAdvertisingConsent, readStoredConsent } from "@/lib/consent";

/**
 * Fire Meta Lead only after a real successful signup action.
 * No PII. Silent when consent or pixel id is missing.
 */
export function trackMetaLeadAfterSignupSuccess(): void {
  if (typeof window === "undefined") return;
  if (!hasAdvertisingConsent(readStoredConsent())) return;
  trackMetaBrowserEvent(
    "Lead",
    {},
    {
      eventId: createMetaEventId(),
      dedupeKey: `Lead:${window.location.pathname}:${Date.now()}`,
    },
  );
}
