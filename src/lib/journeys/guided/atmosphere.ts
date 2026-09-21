import type { GuidedMomentKind } from "./stages";
import type { JourneySlug } from "@/lib/journeys/types";

/** Per-slug visual DNA carried from catalog covers into guided Day. */
export type JourneyAtmosphereDna = {
  slug: JourneySlug;
  /** Motif language shared with cover geometry. */
  motif: "horizon" | "edge" | "path";
  /** CSS custom-property values (color strings). */
  wash: string;
  tint: string;
  line: string;
  highlight: string;
  glow: string;
  inkSoft: string;
};

export type AtmosphereIntensity = "strong" | "present" | "quiet" | "whisper" | "return";

export type StageComposition =
  | "enter"
  | "type"
  | "insight"
  | "action"
  | "prayer"
  | "close";

export type StageAtmosphereProfile = {
  intensity: AtmosphereIntensity;
  composition: StageComposition;
  /** Cropped cover fragment visible. */
  showFragment: boolean;
  /** Abstract motif/line layer. */
  showMotif: boolean;
  /** Progress motif advances with this stage. */
  progressWeight: number;
};

const DNA: Record<JourneySlug, JourneyAtmosphereDna> = {
  "ansiedade-confianca": {
    slug: "ansiedade-confianca",
    motif: "horizon",
    wash: "rgba(90, 34, 50, 0.07)",
    tint: "rgba(184, 150, 90, 0.14)",
    line: "rgba(184, 150, 90, 0.45)",
    highlight: "#B8965A",
    glow: "rgba(240, 230, 208, 0.35)",
    inkSoft: "rgba(90, 34, 50, 0.55)",
  },
  "perdao-limites": {
    slug: "perdao-limites",
    motif: "edge",
    wash: "rgba(198, 160, 90, 0.08)",
    tint: "rgba(107, 46, 58, 0.1)",
    line: "rgba(198, 160, 90, 0.5)",
    highlight: "#C6A05A",
    glow: "rgba(240, 230, 208, 0.28)",
    inkSoft: "rgba(44, 36, 28, 0.5)",
  },
  "recomeco-proposito": {
    slug: "recomeco-proposito",
    motif: "path",
    wash: "rgba(58, 50, 44, 0.06)",
    tint: "rgba(198, 160, 90, 0.12)",
    line: "rgba(107, 46, 58, 0.35)",
    highlight: "#C6A05A",
    glow: "rgba(255, 248, 236, 0.4)",
    inkSoft: "rgba(58, 50, 44, 0.55)",
  },
};

const DEFAULT_DNA: JourneyAtmosphereDna = DNA["ansiedade-confianca"];

const STAGE_PROFILE: Record<GuidedMomentKind, StageAtmosphereProfile> = {
  contexto: {
    intensity: "strong",
    composition: "enter",
    showFragment: true,
    showMotif: true,
    progressWeight: 0,
  },
  escritura: {
    intensity: "quiet",
    composition: "type",
    showFragment: false,
    showMotif: true,
    progressWeight: 1,
  },
  reflexao: {
    intensity: "whisper",
    composition: "insight",
    showFragment: false,
    showMotif: false,
    progressWeight: 2,
  },
  pratico: {
    intensity: "present",
    composition: "action",
    showFragment: false,
    showMotif: true,
    progressWeight: 3,
  },
  oracao: {
    intensity: "quiet",
    composition: "prayer",
    showFragment: false,
    showMotif: true,
    progressWeight: 4,
  },
  fecho: {
    intensity: "return",
    composition: "close",
    showFragment: true,
    showMotif: true,
    progressWeight: 5,
  },
};

/** Deterministic DNA for a journey slug — safe for SSR and tests. */
export function getJourneyAtmosphere(slug: string): JourneyAtmosphereDna {
  return DNA[slug as JourneySlug] ?? DEFAULT_DNA;
}

export function getStageAtmosphere(
  kind: GuidedMomentKind,
): StageAtmosphereProfile {
  return STAGE_PROFILE[kind];
}

/** CSS variables object for inline style on Day root. */
export function journeyAtmosphereStyle(
  slug: string,
): Record<string, string> {
  const dna = getJourneyAtmosphere(slug);
  return {
    "--journey-wash": dna.wash,
    "--journey-tint": dna.tint,
    "--journey-line": dna.line,
    "--journey-highlight": dna.highlight,
    "--journey-glow": dna.glow,
    "--journey-ink-soft": dna.inkSoft,
  };
}

export function isKnownJourneySlug(slug: string): slug is JourneySlug {
  return slug in DNA;
}
