/** Domain types for journey progress — not coupled to DB row shape. */

export interface JourneyProgressRecord {
  userId: string;
  journeySlug: string;
  version: number;
  completedStepIds: string[];
  currentStepId: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface JourneyProgressState {
  journeySlug: string;
  completedStepIds: string[];
  currentStepId: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  isStarted: boolean;
  isCompleted: boolean;
}

export interface StartJourneyInput {
  userId: string;
  journeySlug: string;
  firstStepId: string;
}

export interface CompleteJourneyStepInput {
  userId: string;
  journeySlug: string;
  stepId: string;
  /** Next step id after this one, or null when finishing. */
  nextStepId: string | null;
  /** Full ordered/unordered set of step ids that define journey completion. */
  totalStepIds: string[];
}

export interface ResetJourneyProgressInput {
  userId: string;
  journeySlug: string;
}

export class JourneyProgressError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_input"
      | "persist_failed"
      | "not_found" = "persist_failed",
  ) {
    super(message);
    this.name = "JourneyProgressError";
  }
}

export interface JourneyProgressRepository {
  get(userId: string, journeySlug: string): Promise<JourneyProgressRecord | null>;
  list(userId: string): Promise<JourneyProgressRecord[]>;
  start(
    userId: string,
    journeySlug: string,
    firstStepId: string,
  ): Promise<JourneyProgressRecord>;
  completeStep(input: {
    userId: string;
    journeySlug: string;
    stepId: string;
    nextStepId: string | null;
    totalStepIds: string[];
  }): Promise<JourneyProgressRecord>;
  reset(userId: string, journeySlug: string): Promise<JourneyProgressRecord>;
}
