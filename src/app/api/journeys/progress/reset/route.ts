import { NextResponse } from "next/server";
import {
  createJourneyProgressService,
  getJourneyProgressRepository,
} from "@/lib/journeys/progress";
import { getJourneyBySlug } from "@/lib/journeys/registry";
import { requireJourneyEntitlement } from "@/lib/journeys/api-auth";
import { logJourneyOperationalEvent } from "@/lib/journeys/events";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const auth = await requireJourneyEntitlement();
    const body = (await request.json()) as { journeySlug?: string };
    const journeySlug = body.journeySlug?.trim();
    if (!journeySlug) {
      return NextResponse.json(
        { code: "invalid_journey", message: "Jornada inválida.", requestId },
        { status: 400, headers: NO_STORE },
      );
    }
    const journey = getJourneyBySlug(journeySlug);
    if (!journey) {
      return NextResponse.json(
        { code: "journey_not_found", message: "Jornada não encontrada.", requestId },
        { status: 404, headers: NO_STORE },
      );
    }

    const service = createJourneyProgressService(getJourneyProgressRepository());
    const record = await service.reset({
      userId: auth.userId,
      journeySlug: journey.slug,
    });

    logJourneyOperationalEvent({
      event: "journey_reset",
      userId: auth.userId,
      planKey: auth.planKey,
      journeySlug: journey.slug,
    });

    return NextResponse.json({ progress: record, requestId }, { headers: NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: NO_STORE },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { code: "method_not_allowed", message: "Use POST." },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
