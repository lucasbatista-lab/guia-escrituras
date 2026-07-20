import { NextResponse } from "next/server";
import {
  createJourneyProgressService,
  getJourneyProgressRepository,
} from "@/lib/journeys/progress";
import { getAllJourneys } from "@/lib/journeys/registry";
import { requireJourneyEntitlement } from "@/lib/journeys/api-auth";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  const requestId = createRequestId();
  try {
    const auth = await requireJourneyEntitlement();
    const service = createJourneyProgressService(getJourneyProgressRepository());
    const states = await service.listStates(auth.userId);
    const journeys = getAllJourneys().map((j) => {
      const state = states.find((s) => s.journeySlug === j.slug);
      return {
        journeySlug: j.slug,
        title: j.title,
        stepCount: j.steps.length,
        progress: state ?? {
          journeySlug: j.slug,
          completedStepIds: [],
          currentStepId: null,
          startedAt: null,
          updatedAt: null,
          completedAt: null,
          isStarted: false,
          isCompleted: false,
        },
      };
    });
    return NextResponse.json({ journeys, requestId }, { headers: NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: NO_STORE },
    );
  }
}
