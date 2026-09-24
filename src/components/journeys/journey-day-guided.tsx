"use client";

import Link from "next/link";
import {
  useCallback,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { JourneyVisualAtmosphere } from "@/components/journeys/covers/journey-visual-atmosphere";
import { JourneyArtMotif } from "@/components/journeys/covers/journey-cover-art";
import { JourneyStepCompleteButton } from "@/components/journeys/journey-step-complete-button";
import { Button } from "@/components/ui/button";
import {
  journeyAtmosphereStyle,
  getStageAtmosphere,
} from "@/lib/journeys/guided/atmosphere";
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

const INSIGHT_PREVIEW = 280;

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
  const [insightOpen, setInsightOpen] = useState(false);

  switch (kind) {
    case "contexto":
      // 3A CHEGO — entered the path; breathing room + objective hero
      return (
        <div className="space-y-5 py-2">
          <p className="amem-type-context text-wine">Chego</p>
          <p className="amem-type-moment max-w-[18ch] text-[26px] leading-snug text-ink">
            {step.objective}
          </p>
          <p className="amem-type-meta text-[color:var(--journey-ink-soft,var(--amem-mute))]">
            ~{step.estimatedMinutes} min · um dia, sem pressa
          </p>
          <div
            aria-hidden
            className="h-px w-16 bg-[color:var(--journey-highlight,var(--amem-wine))]/35"
          />
        </div>
      );
    case "escritura":
      // 3B ESCUTO — Scripture as visual focus, not article
      return (
        <div className="space-y-5 rounded-[20px] border border-[color:var(--journey-line,rgba(184,150,90,0.28))] bg-[color:var(--amem-surface,#FFFDFC)]/75 px-5 py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine/80">
            Escuto
          </p>
          <p className="amem-type-scripture text-[26px] leading-snug text-ink">
            {step.bibleReference}
          </p>
          <p className="amem-type-body max-w-[36ch] text-[16px] leading-relaxed text-ink">
            {step.paraphrase}
          </p>
          <p className="amem-type-context opacity-70">
            Em outras palavras · não é citação inventada
          </p>
        </div>
      );
    case "reflexao": {
      // 3C OLHO — one primary insight; progressive reveal if long
      const long = step.reflection.length > INSIGHT_PREVIEW;
      const shown =
        !long || insightOpen
          ? step.reflection
          : `${step.reflection.slice(0, INSIGHT_PREVIEW).trimEnd()}…`;
      return (
        <div className="space-y-4">
          <p className="amem-type-body text-[17px] leading-relaxed text-ink">
            {shown}
          </p>
          {long && !insightOpen ? (
            <button
              type="button"
              className="amem-press min-h-11 text-sm font-medium text-wine underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setInsightOpen(true)}
            >
              Continuar leitura
            </button>
          ) : null}
        </div>
      );
    }
    case "pratico": {
      // 3D PRATICO — question as interaction; practice secondary
      return (
        <div className="space-y-6">
          <div className="rounded-[16px] border border-[color:var(--journey-line,rgba(184,150,90,0.35))] bg-[color:var(--amem-surface,#FFFDFC)]/80 px-4 py-4 shadow-[0_6px_20px_var(--amem-shadow)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Pergunta
            </p>
            <p className="mt-2 text-[17px] leading-relaxed text-ink">
              {step.personalQuestion}
            </p>
          </div>
          <div className="pl-1">
            <p className="amem-type-context text-ink-soft">Prática</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
              {step.practicalAction}
            </p>
          </div>
        </div>
      );
    }
    case "oracao":
      // 3E FALO — quiet prayer scene; prayer as main type
      return (
        <div className="space-y-4 rounded-[22px] bg-[color:var(--amem-surface,#FFFDFC)]/90 px-5 py-7 shadow-[0_16px_40px_-28px_rgba(90,34,50,0.4)]">
          <p className="amem-type-context text-wine/80">Falo · oração</p>
          <blockquote className="amem-type-scripture border-none pl-0 text-[21px] italic leading-snug text-ink">
            {stepPrayer(step)}
          </blockquote>
        </div>
      );
    case "fecho":
      // 3F LEVO — DNA returns via atmosphere; one dominant next action
      return (
        <div className="space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
            Levo
          </p>
          <p className="amem-type-moment text-[20px] leading-snug text-ink">
            {stepClosing(step)}
          </p>

          <SoftEnter tone="ritual" className="space-y-3">
            {completeSlot}
            <p className="text-center text-xs text-ink-soft">
              Sem culpa se voltar depois — o próximo dia espera no seu ritmo.
            </p>
          </SoftEnter>

          {step.safetyNote ? (
            <div className="space-y-1.5 border-t border-border/40 pt-4">
              <p className="amem-type-context text-ink-soft">Cuidado</p>
              <p className="text-sm leading-relaxed text-ink-soft">
                {step.safetyNote}
              </p>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-border/30 pt-3">
            {noteSlot}
          </div>

          <section
            aria-labelledby="step-conversar-heading"
            className="space-y-2 pt-1"
          >
            <h2
              id="step-conversar-heading"
              className="sr-only"
            >
              Para conversar
            </h2>
            <p className="text-xs leading-relaxed text-ink-soft">
              Se quiser continuar, o chat recebe só o contexto editorial deste
              dia — não envia anotações pessoais.
            </p>
            <Button asChild variant="ghost" className="min-h-11 w-full text-ink-soft">
              <Link href={chatHref}>{conversarLabel}</Link>
            </Button>
          </section>
        </div>
      );
    default:
      return null;
  }
}

function StageProgressRail({
  moments,
  stage,
  labelId,
  current,
  journeySlug,
}: {
  moments: GuidedMoment[];
  stage: number;
  labelId: string;
  current: GuidedMoment;
  journeySlug: string;
}) {
  const profile = getStageAtmosphere(current.kind);
  return (
    <div className="space-y-2" role="group" aria-labelledby={labelId}>
      <p id={labelId} className="sr-only">
        Momento {stage + 1} de {moments.length}: {current.verb} ·{" "}
        {current.label}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-medium tracking-wide text-ink-soft">
          {current.verb}
        </span>
        <div className="relative min-w-0 flex-1" aria-hidden>
          <div className="amem-stage-motif-track h-[3px] overflow-hidden rounded-full bg-[color:var(--amem-trilho-track)]/45">
            <div
              className="amem-stage-motif-fill h-full rounded-full bg-[color:var(--journey-highlight,var(--amem-wine))] transition-[width] duration-[var(--amem-dur-normal)] ease-[var(--amem-ease-soft)]"
              style={{
                width: `${((stage + 0.35) / moments.length) * 100}%`,
              }}
            />
          </div>
          <ol className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-0.5">
            {moments.map((m, i) => (
              <li key={m.kind}>
                <span
                  className={cn(
                    "amem-stage-rail block size-1.5 rounded-full transition-opacity duration-[var(--amem-dur-fast)]",
                    i <= stage
                      ? "bg-[color:var(--journey-highlight,var(--amem-wine))] opacity-90"
                      : "bg-transparent opacity-0",
                  )}
                />
              </li>
            ))}
          </ol>
        </div>
        <span className="w-10 shrink-0 opacity-70" aria-hidden>
          <JourneyArtMotif
            slug={journeySlug}
            className={cn(
              "h-5 transition-opacity duration-[var(--amem-dur-normal)]",
              profile.intensity === "whisper" ? "opacity-40" : "opacity-70",
            )}
          />
        </span>
      </div>
    </div>
  );
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
  const atmoStyle = useMemo(
    () => journeyAtmosphereStyle(journeySlug),
    [journeySlug],
  );

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
      dayNumber={step.number}
      totalDays={totalSteps}
    />
  );

  return (
    <div
      className="amem-journey-day flex min-h-[70vh] flex-col pb-[max(6.5rem,calc(5rem+env(safe-area-inset-bottom)))]"
      style={atmoStyle as CSSProperties}
      data-journey-slug={journeySlug}
    >
      <header className="sticky top-0 z-20 -mx-1 mb-3 space-y-2.5 bg-[color:var(--amem-canvas,#F7F5F1)]/90 px-1 pb-2.5 pt-1 backdrop-blur-sm">
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

        <StageProgressRail
          moments={moments}
          stage={stage}
          labelId={progressLabelId}
          current={current}
          journeySlug={journeySlug}
        />
      </header>

      <main className="flex-1 px-0.5" aria-live="polite">
        <SoftSwap swapKey={current.kind} tone="normal" className="space-y-0">
          <JourneyVisualAtmosphere slug={journeySlug} stage={current.kind}>
            {/* Keep stage label for a11y / contracts; hide chrome on quiet stages */}
            {current.kind !== "contexto" &&
            current.kind !== "oracao" &&
            current.kind !== "fecho" ? (
              <p className="mb-3 amem-type-context text-wine/75">
                {current.label}
              </p>
            ) : null}
            <MomentBody
              kind={current.kind}
              step={step}
              noteSlot={noteSlot}
              chatHref={chatHref}
              conversarLabel={conversarLabel}
              completeSlot={completeSlot}
            />
          </JourneyVisualAtmosphere>
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
