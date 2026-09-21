"use client";

import type { ReactNode } from "react";
import {
  JourneyArtFragment,
  JourneyArtMotif,
} from "@/components/journeys/covers/journey-cover-art";
import {
  getStageAtmosphere,
  type AtmosphereIntensity,
} from "@/lib/journeys/guided/atmosphere";
import type { GuidedMomentKind } from "@/lib/journeys/guided/stages";
import { cn } from "@/lib/utils";

const INTENSITY_CLASS: Record<AtmosphereIntensity, string> = {
  strong: "amem-atmo-strong",
  present: "amem-atmo-present",
  quiet: "amem-atmo-quiet",
  whisper: "amem-atmo-whisper",
  return: "amem-atmo-return",
};

/**
 * Carries journey cover DNA into a guided Day stage:
 * wash/tint, optional cropped fragment, optional motif line.
 */
export function JourneyVisualAtmosphere({
  slug,
  stage,
  intensity: intensityOverride,
  children,
  className,
}: {
  slug: string;
  stage: GuidedMomentKind;
  intensity?: AtmosphereIntensity;
  children: ReactNode;
  className?: string;
}) {
  const profile = getStageAtmosphere(stage);
  const intensity = intensityOverride ?? profile.intensity;

  return (
    <div
      className={cn(
        "amem-moment-scene amem-journey-atmo relative overflow-hidden rounded-[22px]",
        `amem-scene-${stage}`,
        INTENSITY_CLASS[intensity],
        className,
      )}
      data-journey-stage={stage}
      data-atmo-intensity={intensity}
    >
      <div
        className="pointer-events-none absolute inset-0 amem-journey-wash"
        aria-hidden
      />
      {profile.showFragment ? (
        <div
          className={cn(
            "relative z-[1] px-3 pt-3",
            intensity === "strong" || intensity === "return"
              ? "opacity-100"
              : "opacity-70",
          )}
          aria-hidden
        >
          <JourneyArtFragment
            slug={slug}
            size={intensity === "strong" ? "hero" : "compact"}
            className="shadow-[0_8px_24px_rgba(25,22,19,0.12)]"
          />
        </div>
      ) : null}
      {profile.showMotif && !profile.showFragment ? (
        <div className="relative z-[1] px-4 pt-3" aria-hidden>
          <JourneyArtMotif slug={slug} />
        </div>
      ) : null}
      <div className="relative z-[2] px-4 py-5 sm:px-5">{children}</div>
    </div>
  );
}
