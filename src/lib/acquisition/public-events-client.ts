"use client";

import type { PlanKey } from "@/lib/entitlements";
import type {
  PublicConversionEventName,
  PublicConversionEventPayload,
  ViewportClass,
} from "./public-event-types";

const SESSION_STORAGE_KEY = "amem_pce_session";
const EVENT_ID_PREFIX = "amem_pce_eid:";

function viewportClass(): ViewportClass {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function newOpaqueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pce_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readSessionStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode / quota — measurement stays fail-open.
  }
}

function getOrCreateSessionKey(): string {
  const existing = readSessionStorage(SESSION_STORAGE_KEY);
  if (existing && existing.length >= 8 && existing.length <= 64) {
    return existing;
  }
  const created = newOpaqueId();
  writeSessionStorage(SESSION_STORAGE_KEY, created);
  return created;
}

/**
 * Stable event_id per (event, path) in the tab session so React Strict Mode
 * remounts and keepalive retries do not double-count after server upsert.
 */
function getOrCreateEventId(
  event: PublicConversionEventName,
  path: string,
): string {
  const key = `${EVENT_ID_PREFIX}${event}:${path}`;
  const existing = readSessionStorage(key);
  if (existing && existing.length >= 8 && existing.length <= 64) {
    return existing;
  }
  const created = newOpaqueId();
  writeSessionStorage(key, created);
  return created;
}

export function trackPublicConversion(
  event: PublicConversionEventName,
  plan: PlanKey | null = null,
): void {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const payload: PublicConversionEventPayload = {
    event,
    event_id: getOrCreateEventId(event, path),
    session_key: getOrCreateSessionKey(),
    path,
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
