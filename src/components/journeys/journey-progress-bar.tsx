import {
  journeyProgressPercent,
  journeyStatusLabel,
  getJourneyVisual,
} from "@/lib/journeys/display";
import type { JourneyProgressState } from "@/lib/journeys/progress";
import { cn } from "@/lib/utils";

export function JourneyProgressBar({
  progress,
  totalSteps,
  labelId,
  journeySlug,
  className,
}: {
  progress: JourneyProgressState | null | undefined;
  totalSteps: number;
  labelId?: string;
  /** Optional — tints the fill with the journey accent. */
  journeySlug?: string;
  className?: string;
}) {
  const done = progress?.completedStepIds.length ?? 0;
  const percent = journeyProgressPercent(progress, totalSteps);
  const status = journeyStatusLabel(progress);
  const barClass = journeySlug
    ? getJourneyVisual(journeySlug).barClass
    : "bg-wine/70";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-ink-soft" id={labelId}>
          {done} de {totalSteps} etapas · {status}
        </span>
        <span className="font-medium text-ink" aria-hidden>
          {percent}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-border/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-labelledby={labelId}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", barClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
