import type {
  CompleteJourneyStepInput,
  JourneyProgressRecord,
  JourneyProgressRepository,
  JourneyProgressState,
  ResetJourneyProgressInput,
  StartJourneyInput,
} from "./types";
import { JourneyProgressError } from "./types";

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new JourneyProgressError(`${field} required`, "invalid_input");
  }
  return trimmed;
}

function normalizeStepIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function toJourneyProgressState(
  record: JourneyProgressRecord | null,
  journeySlug: string,
): JourneyProgressState {
  if (!record) {
    return {
      journeySlug,
      completedStepIds: [],
      currentStepId: null,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
      isStarted: false,
      isCompleted: false,
    };
  }
  return {
    journeySlug: record.journeySlug,
    completedStepIds: [...record.completedStepIds],
    currentStepId: record.currentStepId,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    isStarted: true,
    isCompleted: Boolean(record.completedAt),
  };
}

/**
 * Domain service — structural validation + repository orchestration.
 * Does not know editorial registry, entitlements, Stripe, or UI.
 * Not called from production routes in Persistence Foundation V1.
 */
export function createJourneyProgressService(repo: JourneyProgressRepository) {
  return {
    async getState(
      userId: string,
      journeySlug: string,
    ): Promise<JourneyProgressState> {
      const uid = requireNonEmpty(userId, "userId");
      const slug = requireNonEmpty(journeySlug, "journeySlug");
      const row = await repo.get(uid, slug);
      return toJourneyProgressState(row, slug);
    },

    async listStates(userId: string): Promise<JourneyProgressState[]> {
      const uid = requireNonEmpty(userId, "userId");
      const rows = await repo.list(uid);
      return rows.map((row) => toJourneyProgressState(row, row.journeySlug));
    },

    async start(input: StartJourneyInput): Promise<JourneyProgressRecord> {
      const userId = requireNonEmpty(input.userId, "userId");
      const journeySlug = requireNonEmpty(input.journeySlug, "journeySlug");
      const firstStepId = requireNonEmpty(input.firstStepId, "firstStepId");
      return repo.start(userId, journeySlug, firstStepId);
    },

    async completeStep(
      input: CompleteJourneyStepInput,
    ): Promise<JourneyProgressRecord> {
      const userId = requireNonEmpty(input.userId, "userId");
      const journeySlug = requireNonEmpty(input.journeySlug, "journeySlug");
      const stepId = requireNonEmpty(input.stepId, "stepId");
      const totalStepIds = normalizeStepIds(input.totalStepIds);
      if (totalStepIds.length === 0) {
        throw new JourneyProgressError(
          "totalStepIds required",
          "invalid_input",
        );
      }
      if (!totalStepIds.includes(stepId)) {
        throw new JourneyProgressError(
          "stepId not in totalStepIds",
          "invalid_input",
        );
      }
      const nextStepId = input.nextStepId?.trim() || null;
      return repo.completeStep({
        userId,
        journeySlug,
        stepId,
        nextStepId,
        totalStepIds,
      });
    },

    async reset(
      input: ResetJourneyProgressInput,
    ): Promise<JourneyProgressRecord> {
      const userId = requireNonEmpty(input.userId, "userId");
      const journeySlug = requireNonEmpty(input.journeySlug, "journeySlug");
      return repo.reset(userId, journeySlug);
    },
  };
}

export type JourneyProgressService = ReturnType<
  typeof createJourneyProgressService
>;
