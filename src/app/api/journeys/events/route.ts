import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import {
  logJourneyOperationalEvent,
  type JourneyOperationalEventName,
} from "@/lib/journeys/events";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const ALLOWED = new Set<JourneyOperationalEventName>([
  "journey_catalog_viewed",
  "journey_chat_prefill_opened",
]);

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as {
      event?: string;
      journeySlug?: string;
      stepId?: string;
      origin?: string;
    };
    const event = body.event as JourneyOperationalEventName;
    if (!event || !ALLOWED.has(event)) {
      return NextResponse.json(
        { code: "invalid_event", message: "Evento inválido.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const auth = await getAuthUserContext();
    logJourneyOperationalEvent({
      event,
      userId: auth?.userId ?? null,
      planKey: auth?.planKey ?? null,
      journeySlug: body.journeySlug ?? null,
      stepId: body.stepId ?? null,
      origin: body.origin,
    });
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
