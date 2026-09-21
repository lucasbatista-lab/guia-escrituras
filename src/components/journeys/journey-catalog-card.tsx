import Link from "next/link";
import { JourneyCoverArt } from "@/components/journeys/covers/journey-cover-art";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { LockPill } from "@/components/commerce/lock-pill";
import { Button } from "@/components/ui/button";
import { IconChevron } from "@/components/brand/icons/archive-icons";
import {
  journeyCtaLabel,
  journeyCurrentStepNumber,
  journeyDurationLabel,
  journeyShortPromise,
  journeyStatusLabel,
} from "@/lib/journeys/display";
import type { JourneyProgressState } from "@/lib/journeys/progress";
import type { ReadingJourney } from "@/lib/journeys/types";
import { cn } from "@/lib/utils";

type Props = {
  journey: ReadingJourney;
  progress: JourneyProgressState | null;
  estimatedMinutes?: number;
  /** Free preview mode */
  preview?: boolean;
  dayOneDone?: boolean;
  previewHref?: string;
  featured?: boolean;
};

export function JourneyCatalogCard({
  journey: j,
  progress,
  estimatedMinutes,
  preview = false,
  dayOneDone = false,
  previewHref,
  featured = false,
}: Props) {
  const stepNumber = journeyCurrentStepNumber(progress, j.steps);
  const cta = preview
    ? dayOneDone
      ? "Rever Dia 1"
      : "Abrir Dia 1"
    : journeyCtaLabel(progress, { currentStepNumber: stepNumber });
  const status = preview
    ? `Prévia · Dia 1${dayOneDone ? " · concluído" : ""}`
    : journeyStatusLabel(progress);
  const minutesPerStep =
    j.steps.length > 0 && estimatedMinutes
      ? Math.round(estimatedMinutes / j.steps.length)
      : null;
  const duration = journeyDurationLabel({
    stepCount: j.steps.length,
    minutesPerStep,
  });
  const firstStep = j.steps[0];
  const continueHref = preview
    ? (previewHref ??
      (firstStep
        ? `/jornadas/${j.slug}/${firstStep.slug}`
        : `/jornadas/${j.slug}`))
    : progress?.currentStepId && !progress.isCompleted
      ? `/jornadas/${j.slug}/${j.steps.find((s) => s.id === progress.currentStepId)?.slug ?? firstStep?.slug}`
      : progress?.isCompleted
        ? `/jornadas/${j.slug}/${firstStep?.slug}`
        : `/jornadas/${j.slug}`;
  const promise = journeyShortPromise(j.slug);
  const active =
    featured || Boolean(progress?.isStarted && !progress.isCompleted);

  return (
    <li
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-[22px]",
        active
          ? "shadow-[0_18px_40px_-24px_rgba(44,36,28,0.55)]"
          : "shadow-[0_10px_28px_-22px_rgba(44,36,28,0.4)]",
      )}
    >
      <Link
        href={continueHref}
        className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative overflow-hidden rounded-t-[22px]">
          <JourneyCoverArt slug={j.slug} size={active ? "hero" : "compact"} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-4 pb-3 pt-10">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F0E6D0]/90">
                {status}
                {!preview ? ` · ${duration}` : null}
              </p>
              <h2 className="mt-1 truncate font-display text-[22px] leading-tight text-[#FFF9F0]">
                {j.title}
              </h2>
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF9F0]/15 text-[#FFF9F0] backdrop-blur-sm"
              aria-hidden
            >
              <IconChevron className="size-4" />
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 rounded-b-[22px] border border-t-0 border-border/60 bg-[color:var(--amem-surface)]/95 px-4 pb-4 pt-3.5">
        <p className="text-sm leading-relaxed text-ink">{promise}</p>
        {preview ? (
          <div className="flex flex-wrap items-center gap-2">
            <LockPill label="Caminho" />
          </div>
        ) : null}
        {progress && !preview ? (
          <JourneyProgressBar
            progress={progress}
            totalSteps={j.steps.length}
            journeySlug={j.slug}
            labelId={`progress-${j.slug}`}
          />
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={active || preview ? "ritual" : "outline"}
            className="min-h-11 flex-1 sm:flex-none"
          >
            <Link href={continueHref}>{cta}</Link>
          </Button>
          {preview ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/jornadas/${j.slug}`}>Ver caminho</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
