import type { ReadingJourney, ReadingJourneyStep } from "./types";
import type { JourneyProgressState } from "./progress";

export function journeyIntro(journey: ReadingJourney): string {
  return (
    journey.intro ??
    `${journey.description} São sete etapas, no seu ritmo. Não é prova de fé nem cobrança por pausar. O progresso fica salvo na sua conta.`
  );
}

export function stepPrayer(step: ReadingJourneyStep): string {
  return (
    step.prayer ??
    `Senhor, à luz de ${step.bibleReference}, ajuda-me a viver com honestidade o que esta etapa pede. Amém.`
  );
}

export function stepClosing(step: ReadingJourneyStep): string {
  return (
    step.closing ??
    `Quando fizer sentido, marque esta etapa. O próximo dia continua no seu ritmo — sem culpa por pausar.`
  );
}

export function journeyDayLabel(
  stepNumber: number,
  totalSteps: number,
): string {
  return `Dia ${stepNumber} de ${totalSteps}`;
}

export function journeyResumeHint(
  progress: JourneyProgressState | null | undefined,
  steps: { id: string; number: number; title: string }[],
): string {
  if (!progress?.isStarted) {
    return "Você ainda não começou. O dia 1 espera quando quiser.";
  }
  if (progress.isCompleted) {
    return `Concluída: ${steps.length} de ${steps.length} etapas. Você pode rever quando quiser.`;
  }
  const current = steps.find((s) => s.id === progress.currentStepId);
  const done = progress.completedStepIds.length;
  if (current) {
    return `Você está no dia ${current.number}: ${current.title}. ${done} de ${steps.length} concluídos.`;
  }
  return `${done} de ${steps.length} etapas concluídas. Retome quando puder.`;
}
