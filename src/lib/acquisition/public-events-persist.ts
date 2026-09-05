import "server-only";

import {
  sanitizeLandingPath,
  sanitizeTrackingValue,
} from "@/lib/acquisition/sanitize";
import { UTM_MAX_LEN } from "@/lib/acquisition/types";
import { isPublicConversionPath } from "@/lib/acquisition/public-event-paths";
import type {
  PublicConversionEventName,
  ViewportClass,
} from "@/lib/acquisition/public-event-types";
import { logger } from "@/lib/logging/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseSecretKey } from "@/lib/supabase/secret";
import { getSupabaseUrl } from "@/lib/supabase/keys";

export type PublicConversionPersistInput = {
  eventId: string;
  sessionKey: string;
  event: PublicConversionEventName;
  path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  viewport_class: ViewportClass;
};

export type PublicConversionPersistResult =
  | { ok: true; stored: boolean; duplicate: boolean }
  | { ok: false; reason: string };

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sanitizePublicConversionEventId(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!ID_RE.test(trimmed)) return null;
  return trimmed;
}

/**
 * Persist a sanitized funnel beacon. Never throws — callers must stay fail-open.
 * Duplicate event_id inserts are ignored (no double-count).
 */
export async function persistPublicConversionEvent(
  input: PublicConversionPersistInput,
): Promise<PublicConversionPersistResult> {
  const eventId = sanitizePublicConversionEventId(input.eventId);
  const sessionKey = sanitizePublicConversionEventId(input.sessionKey);
  if (!eventId || !sessionKey) {
    return { ok: false, reason: "invalid_ids" };
  }

  const path = sanitizeLandingPath(input.path);
  if (!isPublicConversionPath(path)) {
    return { ok: false, reason: "path_not_allowed" };
  }

  const row = {
    event_id: eventId,
    event_name: input.event,
    path,
    viewport_class: input.viewport_class,
    utm_source: sanitizeTrackingValue(input.utm_source, UTM_MAX_LEN),
    utm_medium: sanitizeTrackingValue(input.utm_medium, UTM_MAX_LEN),
    utm_campaign: sanitizeTrackingValue(input.utm_campaign, UTM_MAX_LEN),
    utm_content: sanitizeTrackingValue(input.utm_content, UTM_MAX_LEN),
    session_key: sessionKey,
  };

  if (!getSupabaseUrl() || !hasSupabaseSecretKey()) {
    logger.warn("public_conversion_persist_skipped", {
      reason: "admin_client_unavailable",
      event: row.event_name,
      path: row.path,
    });
    return { ok: false, reason: "admin_client_unavailable" };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("public_conversion_events").insert(row);

    if (!error) {
      return { ok: true, stored: true, duplicate: false };
    }

    // Unique violation on event_id — idempotent retry / double-mount.
    if (error.code === "23505") {
      return { ok: true, stored: false, duplicate: true };
    }

    logger.warn("public_conversion_persist_failed", {
      reason: "insert_error",
      code: error.code ?? null,
      event: row.event_name,
      path: row.path,
    });
    return { ok: false, reason: "insert_error" };
  } catch (err) {
    logger.warn("public_conversion_persist_failed", {
      reason: "exception",
      event: row.event_name,
      path: row.path,
      message: err instanceof Error ? err.message.slice(0, 120) : "unknown",
    });
    return { ok: false, reason: "exception" };
  }
}
