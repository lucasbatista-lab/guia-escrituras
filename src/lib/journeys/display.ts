import type { JourneyProgressState } from "@/lib/journeys/progress";
import type { JourneySlug } from "@/lib/journeys/types";

export type JourneyStatusLabel =
  | "Não iniciada"
  | "Em andamento"
  | "Concluída";

/** Distinct catalog identity using existing design tokens — not content accents. */
export type JourneyAccentToken = "wine" | "gold" | "ink";

export type JourneyVisualIdentity = {
  accent: JourneyAccentToken;
  /** Single typographic mark — no icon library. */
  mark: string;
  borderClass: string;
  markBgClass: string;
  markTextClass: string;
  barClass: string;
};

const JOURNEY_VISUAL: Record<JourneySlug, JourneyVisualIdentity> = {
  "ansiedade-confianca": {
    accent: "wine",
    mark: "A",
    borderClass: "border-wine/30",
    markBgClass: "bg-wine/12",
    markTextClass: "text-wine",
    barClass: "bg-wine/70",
  },
  "perdao-limites": {
    accent: "gold",
    mark: "P",
    borderClass: "border-gold/40",
    markBgClass: "bg-gold/15",
    markTextClass: "text-gold",
    barClass: "bg-gold",
  },
  "recomeco-proposito": {
    accent: "ink",
    mark: "R",
    borderClass: "border-ink/25",
    markBgClass: "bg-ink/8",
    markTextClass: "text-ink",
    barClass: "bg-ink/65",
  },
};

const DEFAULT_VISUAL: JourneyVisualIdentity = {
  accent: "wine",
  mark: "J",
  borderClass: "border-border/70",
  markBgClass: "bg-sand-100",
  markTextClass: "text-ink-soft",
  barClass: "bg-wine/70",
};

export function getJourneyVisual(slug: string): JourneyVisualIdentity {
  return JOURNEY_VISUAL[slug as JourneySlug] ?? DEFAULT_VISUAL;
}

export function journeyStatusLabel(
  progress: JourneyProgressState | null | undefined,
): JourneyStatusLabel {
  if (!progress?.isStarted) return "Não iniciada";
  if (progress.isCompleted) return "Concluída";
  return "Em andamento";
}

/**
 * Contextual catalog/detail CTA.
 * Prefer “Continuar etapa X” when the current step number is known.
 */
export function journeyCtaLabel(
  progress: JourneyProgressState | null | undefined,
  options?: { currentStepNumber?: number | null },
): string {
  if (!progress?.isStarted) return "Começar Jornada";
  if (progress.isCompleted) return "Rever Jornada";
  const n = options?.currentStepNumber;
  if (typeof n === "number" && n >= 1) return `Continuar etapa ${n}`;
  return "Continuar Jornada";
}

/** Honest duration line — prefers per-step estimate when available. */
export function journeyDurationLabel(options: {
  stepCount: number;
  /** Typical minutes per step (average), when known from editorial estimates. */
  minutesPerStep?: number | null;
}): string {
  const steps = `${options.stepCount} etapas`;
  const per = options.minutesPerStep;
  if (typeof per === "number" && per > 0) {
    return `${steps} · ~${per} min por etapa`;
  }
  return `${steps} · leitura curta por etapa`;
}

export function journeyProgressPercent(
  progress: JourneyProgressState | null | undefined,
  totalSteps: number,
): number {
  if (!totalSteps) return 0;
  const done = progress?.completedStepIds.length ?? 0;
  return Math.min(100, Math.round((done / totalSteps) * 100));
}

export function journeyCurrentStepNumber(
  progress: JourneyProgressState | null | undefined,
  steps: { id: string; number: number }[],
): number | null {
  if (!progress?.isStarted || progress.isCompleted) return null;
  const current = steps.find((s) => s.id === progress.currentStepId);
  if (current) return current.number;
  const firstIncomplete = steps.find(
    (s) => !progress.completedStepIds.includes(s.id),
  );
  return firstIncomplete?.number ?? null;
}
