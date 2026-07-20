/** Editorial reading journey — deterministic, server-side only. */

export const JOURNEY_STEP_COUNT = 7 as const;

export interface ReadingJourneyStep {
  id: string;
  slug: string;
  number: number;
  title: string;
  objective: string;
  bibleReference: string;
  paraphrase: string;
  reflection: string;
  personalQuestion: string;
  practicalAction: string;
  safetyNote?: string;
  chatSuggestion?: string;
  estimatedMinutes: number;
  tags: string[];
}

export interface ReadingJourney {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  tags: string[];
  steps: ReadingJourneyStep[];
}

export type JourneySlug =
  | "ansiedade-confianca"
  | "perdao-limites"
  | "recomeco-proposito";
