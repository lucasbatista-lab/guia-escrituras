/**
 * Pure helpers to pick a single primary “Retomar” target when the user
 * has both a conversation and a reading journey in progress.
 * Ordering is by last activity timestamp only — no spiritual inference.
 */

export type ReturnTargetKind = "chat" | "journey";

export interface ReturnTargetCandidate {
  kind: ReturnTargetKind;
  /** ISO timestamp of last activity for this target. */
  updatedAt: string;
  title: string;
  /** Optional secondary line (preview, next step title). */
  subtitle?: string | null;
  href: string;
  cta: string;
}

export interface PrimaryReturnSelection {
  primary: ReturnTargetCandidate;
  /** Other in-progress target of a different kind, if any. */
  secondary: ReturnTargetCandidate | null;
}

function activityMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Pick the most recently active target as primary.
 * Secondary is the most recent candidate of a different kind (not a second chat).
 */
export function pickPrimaryReturnTarget(
  candidates: ReturnTargetCandidate[],
): PrimaryReturnSelection | null {
  const valid = candidates.filter(
    (c) => c.href.trim() && c.title.trim() && activityMs(c.updatedAt) > 0,
  );
  if (valid.length === 0) return null;

  const sorted = [...valid].sort(
    (a, b) => activityMs(b.updatedAt) - activityMs(a.updatedAt),
  );
  const primary = sorted[0]!;
  const secondary =
    sorted.find((c) => c.kind !== primary.kind) ?? null;

  return { primary, secondary };
}

/** Most recently updated in-progress journey from a list of states. */
export function pickMostRecentInProgressJourney<
  T extends { updatedAt: string | null; isStarted: boolean; isCompleted: boolean },
>(items: T[]): T | null {
  const open = items.filter((i) => i.isStarted && !i.isCompleted && i.updatedAt);
  if (open.length === 0) return null;
  return [...open].sort(
    (a, b) => activityMs(b.updatedAt!) - activityMs(a.updatedAt!),
  )[0]!;
}
