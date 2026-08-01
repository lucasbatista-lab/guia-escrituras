"use client";

import { hasAdvertisingConsent, readStoredConsent } from "@/lib/consent";
import { createMetaEventId } from "./browser-events";
import type { AdsCheckoutContext } from "./ads-checkout-context";

function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

/** Collect advertising context at checkout click. No PII. */
export function collectAdsCheckoutContext(): AdsCheckoutContext {
  const granted = hasAdvertisingConsent(readStoredConsent());
  if (!granted) {
    return {
      advertisingConsent: false,
      eventSourceUrl: null,
      fbp: null,
      fbc: null,
      eventId: null,
    };
  }

  return {
    advertisingConsent: true,
    eventSourceUrl:
      typeof window !== "undefined" ? window.location.href : null,
    fbp: readBrowserCookie("_fbp"),
    fbc: readBrowserCookie("_fbc"),
    eventId: createMetaEventId(),
  };
}
