import type { ReadingJourneyStep } from "../types";

/** Client-side guided moment kinds — maps existing editorial fields only. */
export type GuidedMomentKind =
  | "contexto"
  | "escritura"
  | "reflexao"
  | "pratico"
  | "oracao"
  | "fecho";

export type GuidedMoment = {
  kind: GuidedMomentKind;
  /** Short stage label shown above the moment (existing editorial names). */
  label: string;
  /** Quiet verb for progress (CHEGO / ESCUTO / … adapted to real content). */
  verb: string;
};

/**
 * Stage existing day fields into one-moment-at-a-time sequence.
 * No fictional content; practicalAction rides with Pergunta; safety on Fecho.
 * Current corpus always has the six anchors — `step` kept for adaptive callers.
 */
export function buildGuidedMoments(step: ReadingJourneyStep): GuidedMoment[] {
  // Touch step so adaptive callers (safety-only days etc.) can diverge later
  // without rewriting content. Today every day has the six fields.
  if (!step.id) return [];
  return [
    { kind: "contexto", label: "Contexto", verb: "Chego" },
    { kind: "escritura", label: "Passagem", verb: "Escuto" },
    { kind: "reflexao", label: "Reflexão", verb: "Olho" },
    { kind: "pratico", label: "Pergunta", verb: "Pratico" },
    { kind: "oracao", label: "Oração", verb: "Falo" },
    { kind: "fecho", label: "Fecho · Levo", verb: "Levo" },
  ];
}

export function guidedStageStorageKey(
  journeySlug: string,
  stepId: string,
): string {
  return `amem.caminho.stage:${journeySlug}:${stepId}`;
}

export function clampStageIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  if (index >= total) return total - 1;
  return Math.floor(index);
}
