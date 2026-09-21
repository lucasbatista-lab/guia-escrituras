"use client";

import Link from "next/link";
import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { JourneyStepCompleteButton } from "@/components/journeys/journey-step-complete-button";
import { Button } from "@/components/ui/button";
import {
  buildGuidedMoments,
  clampStageIndex,
  type GuidedMoment,
  type GuidedMomentKind,
} from "@/lib/journeys/guided/stages";
import { journeyDayLabel, stepClosing, stepPrayer } from "@/lib/journeys/presentation";
import type { ReadingJourneyStep } from "@/lib/journeys/types";
import { SoftEnter, SoftSwap } from "@/components/interaction";
import { cn } from "@/lib/utils";

export type JourneyDayGuidedProps = {
  journeySlug: string;
  journeyTitle: string;
  step: ReadingJourneyStep;
  totalSteps: number;
  stepCompleted: boolean;
  journeyCompleted: boolean;
  isLastStep: boolean;
  nextStepHref: string | null;
  nextStepLabel: string | null;
  nextIsLockedPreview: boolean;
  chatHref: string;
  noteSlot: ReactNode;
  /** Contract strings kept reachable for a11y / existing flows. */
  conversarLabel?: string;
};

/**
 * Guided day UI. Stage index is ephemeral (resets on remount) — day progress
 * stays on the existing backend. No private text in client storage.
 */

function MomentBody({
  kind,
  step,
  noteSlot,
  chatHref,
  conversarLabel,
  completeSlot,
}: {
  kind: GuidedMomentKind;
  step: ReadingJourneyStep;
  noteSlot: ReactNode;
  chatHref: string;
  conversarLabel: string;
  completeSlot: ReactNode;
}) {
  switch (kind) {
    case "contexto":
      return (
        <div className="space-y-4">
          <p className="font-display text-[22px] leading-snug text-ink">
            {step.objective}
          </p>
          <p className="text-sm text-ink-soft">~{step.estimatedMinutes} min</p>
        </div>
      );
    case "escritura":
      return (
        <div className="space-y-4">
          <p className="font-display text-xl text-ink">{step.bibleReference}</p>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {step.paraphrase}
          </p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            Em outras palavras · não é citação inventada
          </p>
        </div>
      );
    case "reflexao":
      return (
        <p className="text-[16px] leading-relaxed text-ink">{step.reflection}</p>
      );
    case "pratico":
      return (
        <div className="space-y-6">
          <div className="border-l-[2.5px] border-wine/40 pl-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Pergunta
            </p>
            <p className="mt-2 text-[16px] leading-relaxed text-ink">
              {step.personalQuestion}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Prática
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {step.practicalAction}
            </p>
          </div>
        </div>
      );
    case "oracao":
      return (
        <p className="font-display text-[19px] italic leading-snug text-ink">
          {stepPrayer(step)}
        </p>
      );
    case "fecho":
      return (
        <div className="space-y-6">
          <div className="rounded-[18px] border border-[rgba(184,150,90,0.28)] bg-[color:var(--amem-recess)]/55 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-brass)]">
              Fecho · Levo
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {stepClosing(step)}
            </p>
          </div>

          {step.safetyNote ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                Cuidado
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                {step.safetyNote}
              </p>
            </div>
          ) : null}

          {noteSlot}

          <section aria-labelledby="step-conversar-heading" className="space-y-3">
            <h2
              id="step-conversar-heading"
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
            >
              Para conversar
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              Se quiser continuar, o chat recebe só o contexto editorial desta
              etapa — não envia anotações pessoais.
            </p>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={chatHref}>{conversarLabel}</Link>
            </Button>
          </section>

          <SoftEnter tone="ritual" className="space-y-3 border-t border-border/50 pt-5">
            {completeSlot}
            <p className="text-center text-xs text-ink-soft">
              Sem culpa se voltar depois — o próximo dia espera no seu ritmo.
            </p>
          </SoftEnter>
        </div>
      );
    default:
      return null;
  }
}

export function JourneyDayGuided({
  journeySlug,
  journeyTitle,
  step,
  totalSteps,
  stepCompleted,
  journeyCompleted,
  isLastStep,
  nextStepHref,
  nextStepLabel,
  nextIsLockedPreview,
  chatHref,
  noteSlot,
  conversarLabel = "Conversar sobre esta reflexão",
}: JourneyDayGuidedProps) {
  const moments = useMemo(() => buildGuidedMoments(step), [step]);
  const progressLabelId = useId();
  // Ephemeral: remount via key={step.id} from page resets stage. Day progress is backend.
  const [stage, setStage] = useState(0);

  const current: GuidedMoment = moments[stage] ?? moments[0]!;
  const isLastMoment = stage >= moments.length - 1;
  const canGoPrev = stage > 0;

  const goNext = useCallback(() => {
    setStage((s) => clampStageIndex(s + 1, moments.length));
  }, [moments.length]);

  const goPrev = useCallback(() => {
    setStage((s) => clampStageIndex(s - 1, moments.length));
  }, [moments.length]);

  const completeSlot = (
    <JourneyStepCompleteButton
      journeySlug={journeySlug}
      stepId={step.id}
      completed={stepCompleted}
      nextStepHref={nextIsLockedPreview ? null : nextStepHref}
      nextStepLabel={nextIsLockedPreview ? null : nextStepLabel}
      journeyHref={`/jornadas/${journeySlug}`}
      isLastStep={isLastStep}
      journeyCompleted={journeyCompleted}
    />
  );

  return (
    <div className="flex min-h-[70vh] flex-col pb-[max(6.5rem,calc(5rem+env(safe-area-inset-bottom)))]">
      <header className="sticky top-0 z-20 -mx-1 mb-4 space-y-3 bg-[color:var(--amem-canvas,#F7F5F1)]/92 px-1 pb-3 pt-1 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Link
            href={`/jornadas/${journeySlug}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar e voltar ao caminho"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-ink-soft">
              {journeyTitle}
            </p>
            <p className="truncate text-sm text-ink">
              {journeyDayLabel(step.number, totalSteps)} · {step.title}
            </p>
          </div>
        </div>

        <div
          className="space-y-1.5"
          role="group"
          aria-labelledby={progressLabelId}
        >
          <p id={progressLabelId} className="sr-only">
            Momento {stage + 1} de {moments.length}: {current.verb} ·{" "}
            {current.label}
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-soft">
            <span>
              {current.verb} · {current.label}
            </span>
            <span aria-hidden>
              {stage + 1}/{moments.length}
            </span>
          </div>
          <ol className="flex items-center gap-1" aria-hidden>
            {moments.map((m, i) => (
              <li key={m.kind} className="flex-1">
                <span
                  className={cn(
                    "amem-stage-rail block h-[3px] rounded-full",
                    i < stage
                      ? "bg-wine"
                      : i === stage
                        ? "bg-wine/80"
                        : "bg-[color:var(--amem-trilho-track)] opacity-45",
                  )}
                />
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="flex-1 px-0.5" aria-live="polite">
        <SoftSwap swapKey={current.kind} tone="normal" className="space-y-0">
          <p className="mb-3 amem-type-context text-wine">
            {current.label}
          </p>
          <MomentBody
            kind={current.kind}
            step={step}
            noteSlot={noteSlot}
            chatHref={chatHref}
            conversarLabel={conversarLabel}
            completeSlot={completeSlot}
          />
        </SoftSwap>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-[color:var(--amem-surface,#FFFDFC)]/95 px-4 py-3 pb-[max(5.25rem,calc(4.25rem+env(safe-area-inset-bottom)))] backdrop-blur-sm md:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="Avançar no dia"
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          {canGoPrev ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 shrink-0 px-3"
              onClick={goPrev}
              aria-label="Momento anterior"
            >
              Anterior
            </Button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden />
          )}

          {!isLastMoment ? (
            <Button
              type="button"
              variant="ritual"
              className="amem-type-action min-h-11 flex-1"
              onClick={goNext}
            >
              Continuar
            </Button>
          ) : stepCompleted && nextStepHref && !nextIsLockedPreview ? (
            <Button asChild variant="ritual" className="min-h-11 flex-1">
              <Link href={nextStepHref}>Próximo dia</Link>
            </Button>
          ) : stepCompleted && nextIsLockedPreview ? (
            <Button asChild variant="ritual" className="min-h-11 flex-1">
              <Link href={nextStepHref ?? `/jornadas/${journeySlug}`}>
                Continuar caminho
              </Link>
            </Button>
          ) : stepCompleted && !nextStepHref ? (
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href="/inicio">Voltar ao início</Link>
            </Button>
          ) : (
            <p className="flex-1 text-center text-xs text-ink-soft">
              Conclua o dia acima quando estiver pronto.
            </p>
          )}
        </div>
      </nav>
    </div>
  );
}
