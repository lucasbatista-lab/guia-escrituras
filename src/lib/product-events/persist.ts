import "server-only";

import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";
import { createClient } from "@/lib/supabase/server";
import {
  isProductEventName,
  sanitizeProductEventPath,
  type ProductEventName,
  type ProductEventPath,
} from "./types";

const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sanitizeProductEventId(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!EVENT_ID_RE.test(trimmed)) return null;
  return trimmed;
}

export async function persistProductEvent(input: {
  userId: string;
  event: ProductEventName;
  eventId: string;
  path: ProductEventPath;
}): Promise<{ stored: boolean; duplicate: boolean }> {
  if (!isProductEventName(input.event)) {
    return { stored: false, duplicate: false };
  }
  const eventId = sanitizeProductEventId(input.eventId);
  const path = sanitizeProductEventPath(input.path);
  if (!eventId || !path) {
    return { stored: false, duplicate: false };
  }

  logger.info("product_event", {
    event: input.event,
    event_id: eventId,
    path,
    userId: maskUserId(input.userId),
  });

  const supabase = await createClient();
  if (!supabase) {
    return { stored: false, duplicate: false };
  }

  const { error } = await supabase.from("product_events").insert({
    user_id: input.userId,
    event_name: input.event,
    event_id: eventId,
    path,
  });

  if (error) {
    const duplicate =
      error.code === "23505" ||
      /duplicate|unique/i.test(error.message ?? "");
    if (!duplicate) {
      logger.warn("product_event_persist_failed", {
        event: input.event,
        reason: error.code ?? "unknown",
      });
    }
    return { stored: false, duplicate };
  }

  return { stored: true, duplicate: false };
}
