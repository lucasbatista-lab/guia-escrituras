import type { JourneyProgressRecord } from "./types";

/**
 * Prepared export shape for a future USER_DATA_EXPORT_VERSION bump.
 * Not attached to the live export document in Persistence Foundation V1 —
 * production must not query journey_progress until the migration is applied
 * and the feature/export wiring is intentionally enabled.
 */
export interface UserDataExportJourneyProgressPrepared {
  journeySlug: string;
  version: number;
  completedStepIds: string[];
  currentStepId: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export function mapJourneyProgressForExport(
  row: JourneyProgressRecord,
): UserDataExportJourneyProgressPrepared {
  return {
    journeySlug: row.journeySlug,
    version: row.version,
    completedStepIds: [...row.completedStepIds],
    currentStepId: row.currentStepId,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export function mapJourneyProgressListForExport(
  rows: JourneyProgressRecord[],
): UserDataExportJourneyProgressPrepared[] {
  return rows
    .slice()
    .sort((a, b) => a.journeySlug.localeCompare(b.journeySlug))
    .map(mapJourneyProgressForExport);
}
