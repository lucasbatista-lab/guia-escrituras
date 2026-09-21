import type { ReactElement } from "react";
import type { JourneySlug } from "@/lib/journeys/types";
import { cn } from "@/lib/utils";

type CoverVariant = "full" | "fragment" | "motif";

type CoverProps = {
  className?: string;
  /** compact = catalog rail; hero = hub/day atmosphere */
  size?: "compact" | "hero";
  /**
   * full = catalog/hub cover;
   * fragment = cropped atmospheric crop for Day scenes;
   * motif = abstract line/shape layer (no full art).
   */
  variant?: CoverVariant;
};

function heightFor(size: "compact" | "hero", variant: CoverVariant): number {
  if (variant === "motif") return size === "hero" ? 48 : 28;
  if (variant === "fragment") return size === "hero" ? 120 : 72;
  return size === "hero" ? 168 : 112;
}

/** Abstract dusk field — Ansiedade / confiança: calm horizon, soft pressure. */
export function CoverAnsiedade({
  className,
  size = "compact",
  variant = "full",
}: CoverProps) {
  const h = heightFor(size, variant);
  if (variant === "motif") {
    return (
      <svg
        viewBox="0 0 320 48"
        width="100%"
        height={h}
        className={cn("block", className)}
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M12 30 C60 18 100 34 160 22 C220 10 260 28 308 18"
          fill="none"
          stroke="var(--journey-line, #B8965A)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle
          cx="248"
          cy="20"
          r="3"
          fill="var(--journey-highlight, #B8965A)"
          opacity="0.85"
        />
      </svg>
    );
  }
  const fragmentClip =
    variant === "fragment" ? "amem-cover-fragment-clip" : undefined;
  return (
    <div className={cn("relative overflow-hidden", fragmentClip, className)}>
      <svg
        viewBox="0 0 320 168"
        width="100%"
        height={h}
        className={cn(
          "block",
          variant === "fragment" && "scale-[1.35] origin-[72%_38%]",
        )}
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="ac-sky" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#3A2430" />
            <stop offset="45%" stopColor="#5A2232" />
            <stop offset="100%" stopColor="#2A1A22" />
          </linearGradient>
          <linearGradient id="ac-haze" x1="0" y1="0.3" x2="1" y2="0.8">
            <stop offset="0%" stopColor="#B8965A" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#D4BC8C" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#B8965A" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ac-glow" cx="72%" cy="38%" r="35%">
            <stop offset="0%" stopColor="#F0E6D0" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#B8965A" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#B8965A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="168" fill="url(#ac-sky)" />
        <ellipse cx="230" cy="64" rx="90" ry="48" fill="url(#ac-glow)" />
        <path
          d="M0 118 C40 108 70 128 110 118 C150 108 180 126 220 116 C260 106 290 122 320 112 L320 168 L0 168 Z"
          fill="#241820"
          opacity="0.85"
        />
        <path
          d="M0 132 C50 124 90 140 140 130 C190 120 240 138 320 128 L320 168 L0 168 Z"
          fill="#1A1218"
        />
        <path
          d="M28 72 C60 58 88 66 108 54"
          fill="none"
          stroke="url(#ac-haze)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="248" cy="52" r="3.2" fill="#F5EBD8" opacity="0.9" />
        <circle cx="248" cy="52" r="14" fill="#B8965A" opacity="0.18" />
      </svg>
    </div>
  );
}

/** Geometric balance — Perdão / limites: two planes meeting with a clear edge. */
export function CoverPerdao({
  className,
  size = "compact",
  variant = "full",
}: CoverProps) {
  const h = heightFor(size, variant);
  if (variant === "motif") {
    return (
      <svg
        viewBox="0 0 320 48"
        width="100%"
        height={h}
        className={cn("block", className)}
        aria-hidden
        preserveAspectRatio="none"
      >
        <line
          x1="148"
          y1="6"
          x2="120"
          y2="42"
          stroke="var(--journey-line, #C6A05A)"
          strokeWidth="1.5"
          strokeOpacity="0.65"
        />
        <circle
          cx="136"
          cy="24"
          r="5"
          fill="none"
          stroke="var(--journey-highlight, #C6A05A)"
          strokeWidth="1.2"
          opacity="0.75"
        />
        <circle
          cx="136"
          cy="24"
          r="2"
          fill="var(--journey-highlight, #C6A05A)"
          opacity="0.8"
        />
      </svg>
    );
  }
  const fragmentClip =
    variant === "fragment" ? "amem-cover-fragment-clip" : undefined;
  return (
    <div className={cn("relative overflow-hidden", fragmentClip, className)}>
      <svg
        viewBox="0 0 320 168"
        width="100%"
        height={h}
        className={cn(
          "block",
          variant === "fragment" && "scale-[1.4] origin-[46%_50%]",
        )}
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="pl-base" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2C241C" />
            <stop offset="100%" stopColor="#1E1814" />
          </linearGradient>
          <linearGradient id="pl-warm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C6A05A" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C6A05A" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="pl-cool" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B2E3A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6B2E3A" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect width="320" height="168" fill="url(#pl-base)" />
        <path d="M0 0 L168 0 L120 168 L0 168 Z" fill="url(#pl-warm)" />
        <path d="M168 0 L320 0 L320 168 L120 168 Z" fill="url(#pl-cool)" />
        <line
          x1="168"
          y1="12"
          x2="120"
          y2="156"
          stroke="#F0E6D0"
          strokeWidth="1.5"
          strokeOpacity="0.55"
        />
        <circle
          cx="148"
          cy="84"
          r="22"
          fill="none"
          stroke="#C6A05A"
          strokeWidth="1.2"
          opacity="0.7"
        />
        <circle cx="148" cy="84" r="6" fill="#F0E6D0" opacity="0.85" />
        <rect
          x="36"
          y="128"
          width="48"
          height="2"
          rx="1"
          fill="#C6A05A"
          opacity="0.5"
        />
        <rect
          x="236"
          y="38"
          width="36"
          height="2"
          rx="1"
          fill="#D4BC8C"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

/** Dawn path — Recomeço / propósito: trail opening toward light. */
export function CoverRecomeco({
  className,
  size = "compact",
  variant = "full",
}: CoverProps) {
  const h = heightFor(size, variant);
  if (variant === "motif") {
    return (
      <svg
        viewBox="0 0 320 48"
        width="100%"
        height={h}
        className={cn("block", className)}
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M160 44 C152 30 148 18 160 6 C172 18 168 30 160 44"
          fill="var(--journey-line, #4A3E36)"
          opacity="0.45"
        />
        <circle
          cx="160"
          cy="10"
          r="3.5"
          fill="var(--journey-highlight, #C6A05A)"
          opacity="0.9"
        />
      </svg>
    );
  }
  const fragmentClip =
    variant === "fragment" ? "amem-cover-fragment-clip" : undefined;
  return (
    <div className={cn("relative overflow-hidden", fragmentClip, className)}>
      <svg
        viewBox="0 0 320 168"
        width="100%"
        height={h}
        className={cn(
          "block",
          variant === "fragment" && "scale-[1.3] origin-[50%_28%]",
        )}
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="rp-sky" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#EDE6DA" />
            <stop offset="40%" stopColor="#D8CFC0" />
            <stop offset="100%" stopColor="#3A322C" />
          </linearGradient>
          <radialGradient id="rp-dawn" cx="50%" cy="28%" r="42%">
            <stop offset="0%" stopColor="#FFF8EC" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#C6A05A" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C6A05A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="168" fill="url(#rp-sky)" />
        <ellipse cx="160" cy="48" rx="110" ry="56" fill="url(#rp-dawn)" />
        <path
          d="M0 98 C70 88 110 108 160 96 C210 84 250 104 320 92 L320 168 L0 168 Z"
          fill="#2A2420"
          opacity="0.9"
        />
        <path
          d="M0 118 C80 112 120 128 160 118 C200 108 240 126 320 116 L320 168 L0 168 Z"
          fill="#1C1816"
        />
        <path
          d="M160 168 C152 140 148 118 160 92 C172 118 168 140 160 168"
          fill="#4A3E36"
          opacity="0.75"
        />
        <circle cx="160" cy="44" r="4" fill="#FFF9F0" />
        <circle cx="160" cy="44" r="18" fill="#C6A05A" opacity="0.22" />
        <path
          d="M96 72 C120 64 140 70 160 62"
          fill="none"
          stroke="#6B2E3A"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

const COVERS: Record<JourneySlug, (props: CoverProps) => ReactElement> = {
  "ansiedade-confianca": CoverAnsiedade,
  "perdao-limites": CoverPerdao,
  "recomeco-proposito": CoverRecomeco,
};

export function JourneyCoverArt({
  slug,
  className,
  size = "compact",
  variant = "full",
}: CoverProps & { slug: string }) {
  const Comp = COVERS[slug as JourneySlug] ?? CoverAnsiedade;
  return <Comp className={className} size={size} variant={variant} />;
}

/** Atmospheric fragment — cropped cover DNA for Day interiors. */
export function JourneyArtFragment({
  slug,
  className,
  size = "hero",
}: {
  slug: string;
  className?: string;
  size?: "compact" | "hero";
}) {
  return (
    <JourneyCoverArt
      slug={slug}
      size={size}
      variant="fragment"
      className={cn("amem-art-fragment rounded-[18px]", className)}
    />
  );
}

/** Quiet motif/line layer — no full-bleed art. */
export function JourneyArtMotif({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  return (
    <JourneyCoverArt
      slug={slug}
      size="compact"
      variant="motif"
      className={cn("amem-art-motif opacity-80", className)}
    />
  );
}
