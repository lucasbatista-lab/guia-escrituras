import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  sanitizeLandingPath,
  sanitizeTrackingValue,
  UTM_MAX_LEN,
} from "@/lib/acquisition";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";
import { logger } from "@/lib/logging/logger";

const eventSchema = z
  .object({
    event: z.enum(PUBLIC_CONVERSION_EVENTS),
    path: z.string().max(240),
    utm_source: z.string().max(160).nullable(),
    utm_medium: z.string().max(160).nullable(),
    utm_campaign: z.string().max(160).nullable(),
    utm_content: z.string().max(160).nullable(),
    plan: z.enum(["essencial", "caminho", "profundo"]).nullable(),
    viewport_class: z.enum(["mobile", "tablet", "desktop"]),
  })
  .strict();

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
  logger.info("public_conversion_event", {
    event: input.event,
    timestamp: new Date().toISOString(),
    path: sanitizeLandingPath(input.path),
    utm_source: sanitizeTrackingValue(input.utm_source, UTM_MAX_LEN),
    utm_medium: sanitizeTrackingValue(input.utm_medium, UTM_MAX_LEN),
    utm_campaign: sanitizeTrackingValue(input.utm_campaign, UTM_MAX_LEN),
    utm_content: sanitizeTrackingValue(input.utm_content, UTM_MAX_LEN),
    plan: input.plan,
    viewport_class: input.viewport_class,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
