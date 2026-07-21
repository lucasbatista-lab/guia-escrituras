/**
 * Crisis safety — detection types.
 * Classification is ephemeral (logs/category only); never persisted as a DB column.
 */
export type CrisisCategory =
  | "suicide"
  | "self_harm"
  | "violence"
  | "abuse"
  | "medical_emergency";

export interface CrisisMatch {
  matched: true;
  category: CrisisCategory;
  /** Opaque signal ids for tests/logs — not user text. */
  signalIds: string[];
}

export interface CrisisMiss {
  matched: false;
}

export type CrisisDetectionResult = CrisisMatch | CrisisMiss;
