import {
  journeyProgressPercent,
  journeyStatusLabel,
} from "@/lib/journeys/display";
import type { JourneyProgressState } from "@/lib/journeys/progress";

export function JourneyProgressBar({
  progress,
  totalSteps,
  labelId,
}: {
  progress: JourneyProgressState | null | undefined;
  totalSteps: number;
  labelId?: string;
}) {
  const done = progress?.completedStepIds.length ?? 0;
  const percent = journeyProgressPercent(progress, totalSteps);
  const status = journeyStatusLabel(progress);

  return (
    <div className="space-y-2">
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
          className="h-full rounded-full bg-wine/70 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
