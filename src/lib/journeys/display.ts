import type { JourneyProgressState } from "@/lib/journeys/progress";

export type JourneyStatusLabel =
  | "Não iniciada"
  | "Em andamento"
  | "Concluída";

export function journeyStatusLabel(
  progress: JourneyProgressState | null | undefined,
): JourneyStatusLabel {
  if (!progress?.isStarted) return "Não iniciada";
  if (progress.isCompleted) return "Concluída";
  return "Em andamento";
}

export function journeyCtaLabel(
  progress: JourneyProgressState | null | undefined,
): string {
  if (!progress?.isStarted) return "Começar jornada";
  if (progress.isCompleted) return "Rever jornada";
  return "Continuar jornada";
}

export function journeyProgressPercent(
  progress: JourneyProgressState | null | undefined,
  totalSteps: number,
): number {
  if (!totalSteps) return 0;
  const done = progress?.completedStepIds.length ?? 0;
  return Math.min(100, Math.round((done / totalSteps) * 100));
}
