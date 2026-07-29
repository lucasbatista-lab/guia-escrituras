"use client";

import type { PlanKey } from "@/lib/entitlements";
import type {
  PublicConversionEventName,
  PublicConversionEventPayload,
  ViewportClass,
} from "./public-event-types";

function viewportClass(): ViewportClass {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

export function trackPublicConversion(
  event: PublicConversionEventName,
  plan: PlanKey | null = null,
): void {
  const params = new URLSearchParams(window.location.search);
  const payload: PublicConversionEventPayload = {
    event,
    path: window.location.pathname,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    plan,
    viewport_class: viewportClass(),
  };

  void fetch("/api/acquisition/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => {
    // Measurement must never block the visitor's journey.
  });
}
