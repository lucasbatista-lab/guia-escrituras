import { afterEach, describe, expect, it } from "vitest";
import {
  createJourneyProgressService,
  mapJourneyProgressListForExport,
  MemoryJourneyProgressRepository,
} from "@/lib/journeys/progress";
import { getJourneyBySlug } from "@/lib/journeys/registry";
import {
  FIXTURE_JOURNEY_SLUG,
  SYNTHETIC_USERS,
} from "./fixtures/synthetic-users";

describe("real-usage: Caminho journey progress flow", () => {
  const memory = new MemoryJourneyProgressRepository();
  const service = createJourneyProgressService(memory);
  const userA = SYNTHETIC_USERS["syn-caminho"].userId;
  const userB = SYNTHETIC_USERS["syn-profundo"].userId;
  const journey = getJourneyBySlug(FIXTURE_JOURNEY_SLUG)!;
  const stepIds = journey.steps.map((s) => s.id);
  const first = journey.steps[0]!;
  const second = journey.steps[1]!;

  afterEach(() => {
    memory.clear();
  });

  it("starts, completes a step, and persists after simulated reload", async () => {
    await service.start({
      userId: userA,
      journeySlug: journey.slug,
      firstStepId: first.id,
    });

    await service.completeStep({
      userId: userA,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });

    // Simulated reload / new request: fresh service over same store.
    const reloaded = createJourneyProgressService(memory);
    const state = await reloaded.getState(userA, journey.slug);
    expect(state.isStarted).toBe(true);
    expect(state.completedStepIds).toContain(first.id);
    expect(state.currentStepId).toBe(second.id);
    expect(state.isCompleted).toBe(false);
  });

  it("second session (same userId) sees the same progress", async () => {
    await service.start({
      userId: userA,
      journeySlug: journey.slug,
      firstStepId: first.id,
    });
    await service.completeStep({
      userId: userA,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });

    const session2 = createJourneyProgressService(memory);
    const state = await session2.getState(userA, journey.slug);
    expect(state.completedStepIds).toEqual(
      expect.arrayContaining([first.id]),
    );
  });

  it("completeStep is idempotent for the same step", async () => {
    await service.start({
      userId: userA,
      journeySlug: journey.slug,
      firstStepId: first.id,
    });
    const once = await service.completeStep({
      userId: userA,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });
    const twice = await service.completeStep({
      userId: userA,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });
    expect(twice.completedStepIds.filter((id) => id === first.id)).toHaveLength(
      1,
    );
    expect(once.completedStepIds).toEqual(twice.completedStepIds);
  });

  it("reset isolates one journey without touching another user", async () => {
    const otherSlug = "perdao-limites";
    const other = getJourneyBySlug(otherSlug)!;

    await service.start({
      userId: userA,
      journeySlug: journey.slug,
      firstStepId: first.id,
    });
    await service.completeStep({
      userId: userA,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });
    await service.start({
      userId: userA,
      journeySlug: other.slug,
      firstStepId: other.steps[0]!.id,
    });
    await service.start({
      userId: userB,
      journeySlug: journey.slug,
      firstStepId: first.id,
    });
    await service.completeStep({
      userId: userB,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });

    await service.reset({ userId: userA, journeySlug: journey.slug });

    const aPrimary = await service.getState(userA, journey.slug);
    const aOther = await service.getState(userA, other.slug);
    const bPrimary = await service.getState(userB, journey.slug);

    expect(aPrimary.completedStepIds).toEqual([]);
    expect(aPrimary.isStarted).toBe(true);
    expect(aOther.isStarted).toBe(true);
    expect(bPrimary.completedStepIds).toContain(first.id);
  });

  it("export mapper includes journeyProgress without personal reflection text", async () => {
    await service.start({
      userId: userA,
      journeySlug: journey.slug,
      firstStepId: first.id,
    });
    await service.completeStep({
      userId: userA,
      journeySlug: journey.slug,
      stepId: first.id,
      nextStepId: second.id,
      totalStepIds: stepIds,
    });

    const rows = await memory.list(userA);
    const exported = mapJourneyProgressListForExport(rows);
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({
      journeySlug: journey.slug,
      status: "in_progress",
    });
    expect(exported[0]!.completedStepIds).toContain(first.id);
    const blob = JSON.stringify(exported);
    expect(blob).not.toMatch(/Quero refletir|oração|ansiedade pessoal/i);
  });
});
