import type { BiblicalReference } from "./types";

export type Testament = "ot" | "nt";

/** Theme keys used for deterministic retrieval. */
export type BiblicalTheme =
  | "ansiedade"
  | "medo"
  | "mudanca"
  | "luto"
  | "esperanca"
  | "perdao"
  | "culpa"
  | "raiva"
  | "familia"
  | "relacionamentos"
  | "solidao"
  | "decisoes"
  | "trabalho"
  | "dinheiro"
  | "proposito"
  | "sofrimento"
  | "oracao"
  | "fe"
  | "recomeco"
  | "servico"
  | "amor_ao_proximo"
  | "conflitos"
  | "tentacao"
  | "gratidao"
  | "perseveranca";

export interface CuratedBiblicalEntry {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  formattedReference: string;
  testament: Testament;
  themes: BiblicalTheme[];
  /** Editorial paraphrase — never a licensed translation quote. */
  editorialSummary: string;
  contextNote: string;
  /** Optional note when traditions differ meaningfully. */
  denominationalNotes?: string;
  /** Gospel-centric (Matthew–John). */
  isGospel?: boolean;
  /** Pauline corpus affinity. */
  isPauline?: boolean;
  /** Devotional/saint-oriented material; blocked for evangelical. */
  requiresSaintsContent?: boolean;
}

export interface BiblicalRetrievalInput {
  question: string;
  traditionKey: string;
  personaKey: string;
  allowsSaintsContent: boolean;
  /** Seed for deterministic variety (requestId or similar). */
  varietySeed?: string;
  limit?: number;
}

export interface RetrievedBiblicalPassage {
  entry: CuratedBiblicalEntry;
  score: number;
  matchedThemes: BiblicalTheme[];
}

export interface BiblicalGroundingResult {
  groundingProvider: "curated_v1";
  retrieved: RetrievedBiblicalPassage[];
  retrievedReferenceIds: string[];
  groundingCount: number;
  allowedReferences: BiblicalReference[];
}

export interface BiblicalGroundingProvider {
  readonly providerId: "curated_v1";
  assertCorpusReady(): void;
  getCorpusSize(): number;
  listEntries(): readonly CuratedBiblicalEntry[];
  retrieve(input: BiblicalRetrievalInput): BiblicalGroundingResult;
}
