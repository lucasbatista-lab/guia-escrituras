import type { JourneyProgressRecord } from "./types";
import type { UserDataExportJourneyProgress } from "@/lib/account/export-types";

export function mapJourneyProgressForExport(
  row: JourneyProgressRecord,
): UserDataExportJourneyProgress {
  const status = row.completedAt
    ? "completed"
    : row.completedStepIds.length > 0 || row.currentStepId
      ? "in_progress"
      : "not_started";
  return {
    journeySlug: row.journeySlug,
    version: row.version,
    completedStepIds: [...row.completedStepIds],
    currentStepId: row.currentStepId,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    status,
  };
}

export function mapJourneyProgressListForExport(
  rows: JourneyProgressRecord[],
): UserDataExportJourneyProgress[] {
  return rows
    .slice()
    .sort((a, b) => a.journeySlug.localeCompare(b.journeySlug))
    .map(mapJourneyProgressForExport);
}
