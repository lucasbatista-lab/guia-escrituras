import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  sanitizeLandingPath,
  sanitizeTrackingValue,
  UTM_MAX_LEN,
} from "@/lib/acquisition";
import { isPublicConversionPath } from "@/lib/acquisition/public-event-paths";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";
import {
  persistPublicConversionEvent,
  sanitizePublicConversionEventId,
} from "@/lib/acquisition/public-events-persist";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
/** Bound serverless lifetime so awaited persist is not cut mid-flight by default. */
export const maxDuration = 15;

const eventSchema = z
  .object({
    event: z.enum(PUBLIC_CONVERSION_EVENTS),
    event_id: z.string().min(8).max(64),
    session_key: z.string().min(8).max(64),
    path: z.string().max(240),
    utm_source: z.string().max(160).nullable(),
    utm_medium: z.string().max(160).nullable(),
    utm_campaign: z.string().max(160).nullable(),
    utm_content: z.string().max(160).nullable(),
    plan: z.enum(["essencial", "caminho", "profundo"]).nullable(),
    viewport_class: z.enum(["mobile", "tablet", "desktop"]),
  })
  .strict();

/**
 * First-party funnel beacon.
 * - Validation failures → 4xx (no write).
 * - Persist is always awaited before the response (Vercel/serverless-safe).
 * - Persist failures still return 202 so CTAs/signup never block; body.persist
 *   tells operators whether a row was stored (HTTP 202 alone ≠ durability).
 */
export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const input = parsed.data;
  const eventId = sanitizePublicConversionEventId(input.event_id);
  const sessionKey = sanitizePublicConversionEventId(input.session_key);
  const path = sanitizeLandingPath(input.path);

  if (!eventId || !sessionKey || !isPublicConversionPath(path)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const utm_source = sanitizeTrackingValue(input.utm_source, UTM_MAX_LEN);
  const utm_medium = sanitizeTrackingValue(input.utm_medium, UTM_MAX_LEN);
  const utm_campaign = sanitizeTrackingValue(input.utm_campaign, UTM_MAX_LEN);
  const utm_content = sanitizeTrackingValue(input.utm_content, UTM_MAX_LEN);

  logger.info("public_conversion_event", {
    event: input.event,
    event_id: eventId,
    timestamp: new Date().toISOString(),
    path,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    plan: input.plan,
    viewport_class: input.viewport_class,
  });

  let persist: {
    stored: boolean;
    duplicate: boolean;
    reason: string | null;
  } = { stored: false, duplicate: false, reason: "not_attempted" };

  // Await write before responding — do not fire-and-forget on serverless.
  try {
    const persisted = await persistPublicConversionEvent({
      eventId,
      sessionKey,
      event: input.event,
      path,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      viewport_class: input.viewport_class,
    });
    if (persisted.ok) {
      persist = {
        stored: persisted.stored,
        duplicate: persisted.duplicate,
        reason: null,
      };
      if (persisted.duplicate) {
        logger.info("public_conversion_event_duplicate", {
          event: input.event,
          event_id: eventId,
          path,
        });
      } else if (persisted.stored) {
        logger.info("public_conversion_persisted", {
          event: input.event,
          event_id: eventId,
          path,
        });
      }
    } else {
      persist = {
        stored: false,
        duplicate: false,
        reason: persisted.reason,
      };
      logger.warn("public_conversion_persist_result", {
        event: input.event,
        path,
        reason: persisted.reason,
      });
    }
  } catch (err) {
    persist = {
      stored: false,
      duplicate: false,
      reason: "unexpected",
    };
    logger.warn("public_conversion_persist_result", {
      event: input.event,
      path,
      reason: "unexpected",
      message: err instanceof Error ? err.message.slice(0, 120) : "unknown",
    });
  }

  return NextResponse.json(
    { ok: true, persist },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: false },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
