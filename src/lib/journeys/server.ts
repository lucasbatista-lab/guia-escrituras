import "server-only";

import { cache } from "react";
import {
  createJourneyProgressService,
  getJourneyProgressRepository,
  type JourneyProgressState,
} from "@/lib/journeys/progress";
import {
  getAllJourneys,
  getJourneyBySlug,
  getJourneyEstimatedMinutes,
} from "@/lib/journeys/registry";

/** Request-scoped — /inicio loads map for resume priority and catalog card. */
export const loadJourneyProgressMap = cache(
  async function loadJourneyProgressMap(
    userId: string,
  ): Promise<Map<string, JourneyProgressState>> {
    const service = createJourneyProgressService(getJourneyProgressRepository());
    const states = await service.listStates(userId);
    return new Map(states.map((s) => [s.journeySlug, s]));
  },
);

export const loadJourneyProgress = cache(async function loadJourneyProgress(
  userId: string,
  journeySlug: string,
): Promise<JourneyProgressState> {
  const service = createJourneyProgressService(getJourneyProgressRepository());
  return service.getState(userId, journeySlug);
});

export function buildCatalogItems(
  progressMap: Map<string, JourneyProgressState>,
) {
  return getAllJourneys().map((journey) => ({
    journey,
    progress: progressMap.get(journey.slug) ?? null,
    estimatedMinutes: getJourneyEstimatedMinutes(journey),
  }));
}

export async function ensureJourneyStarted(
  userId: string,
  journeySlug: string,
): Promise<JourneyProgressState> {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey?.steps[0]) {
    throw new Error("invalid journey");
  }
  const service = createJourneyProgressService(getJourneyProgressRepository());
  const current = await service.getState(userId, journeySlug);
  if (current.isStarted) return current;
  await service.start({
    userId,
    journeySlug,
    firstStepId: journey.steps[0].id,
  });
  return service.getState(userId, journeySlug);
}
