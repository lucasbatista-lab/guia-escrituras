import type { BiblicalReference } from "./types";
import type {
  BiblicalGroundingProvider,
  BiblicalGroundingResult,
  BiblicalRetrievalInput,
  BiblicalTheme,
  CuratedBiblicalEntry,
  RetrievedBiblicalPassage,
} from "./curated-types";
import { CURATED_BIBLICAL_CORPUS_V1 } from "./corpus-v1";
import { validateBiblicalReference } from "./validation";
import { AppError } from "@/lib/safety";

const THEME_KEYWORDS: Record<BiblicalTheme, string[]> = {
  ansiedade: [
    "ansios",
    "ansied",
    "preocup",
    "angust",
    "inquiet",
    "nervos",
    "stress",
    "estresse",
  ],
  medo: ["medo", "temor", "assust", "pavor", "receio", "pânico", "panico"],
  mudanca: [
    "mudanç",
    "mudanc",
    "transiç",
    "transic",
    "novo emprego",
    "mudar",
    "virada",
  ],
  luto: ["luto", "perda", "morr", "faleci", "saudade", "viuv"],
  esperanca: ["esperan", "ânimo", "animo", "desanim", "consolo"],
  perdao: ["perdã", "perdo", "ofend", "mago", "reconcili", "perdoar"],
  culpa: ["culpa", "vergonha", "arrepend", "pecado", "conden"],
  raiva: ["raiva", "ira", "ódio", "odio", "irrit", "fúria", "furia", "bravo"],
  familia: [
    "família",
    "familia",
    "pais",
    "filho",
    "mãe",
    "mae",
    "pai",
    "irmão",
    "irmao",
  ],
  relacionamentos: [
    "relacion",
    "casamento",
    "namoro",
    "amigo",
    "esposa",
    "marido",
    "parceiro",
  ],
  solidao: ["solidao", "solidão", "sozinho", "sozinha", "isolad", "abandona", "isolamento"],
  decisoes: [
    "decis",
    "escolh",
    "dúvida",
    "duvida",
    "caminho",
    "orientação",
    "orientacao",
  ],
  trabalho: ["trabalh", "emprego", "chefe", "carreira", "profissional"],
  dinheiro: [
    "dinheiro",
    "finanç",
    "financ",
    "dívida",
    "divida",
    "salário",
    "salario",
    "pobreza",
  ],
  proposito: ["propósito", "proposito", "chamado", "vocação", "vocacao", "sentido"],
  sofrimento: ["sofr", "dor", "afliç", "aflac", "tribula", "crise"],
  oracao: ["oraç", "orac", "orai", "intercess"],
  fe: ["fé", " fe ", "crer", "confiança", "confianca", "descren"],
  recomeco: ["recom", "recome", "recomeçar", "recomecar", "recomeçar", "nova vida"],
  servico: ["servi", "volunt", "missão", "missao", "ajuda aos outros"],
  amor_ao_proximo: [
    "próximo",
    "proximo",
    "caridade",
    "misericórd",
    "misericord",
    "amar o outro",
  ],
  conflitos: ["conflito", "briga", "disputa", "discuss", "inimiz"],
  tentacao: ["tentaç", "tentac", "pecar", "vício", "vicio", "queda"],
  gratidao: ["gratid", "agradec", "louvor", "bendiz"],
  perseveranca: [
    "persever",
    "persist",
    "não desistir",
    "nao desistir",
    "resistir",
    "cansaço",
    "cansaco",
  ],
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function detectThemes(question: string): BiblicalTheme[] {
  const q = ` ${normalize(question)} `;
  const matched: BiblicalTheme[] = [];
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as [
    BiblicalTheme,
    string[],
  ][]) {
    if (keywords.some((kw) => q.includes(normalize(kw)))) {
      matched.push(theme);
    }
  }
  return matched;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function toReference(entry: CuratedBiblicalEntry): BiblicalReference {
  return {
    book: entry.book,
    chapter: entry.chapter,
    verseStart: entry.verseStart,
    verseEnd:
      entry.verseEnd !== entry.verseStart ? entry.verseEnd : undefined,
  };
}

function scoreEntry(
  entry: CuratedBiblicalEntry,
  themes: BiblicalTheme[],
  personaKey: string,
): { score: number; matchedThemes: BiblicalTheme[] } {
  const matchedThemes = entry.themes.filter((t) => themes.includes(t));
  let score = matchedThemes.length * 10;

  if (themes.length === 0) {
    score += 1;
  }

  if (personaKey === "jesus" && entry.isGospel) {
    score += 6;
  } else if (personaKey === "paulo" && entry.isPauline) {
    score += 6;
  } else if (personaKey === "jesus" && entry.isPauline) {
    score += 1;
  } else if (personaKey === "paulo" && entry.isGospel) {
    score += 2;
  }

  // Mild diversification weight by testament for gospel-first persona
  if (personaKey === "jesus" && entry.testament === "nt") {
    score += 1;
  }

  return { score, matchedThemes };
}

export class CuratedBiblicalProvider implements BiblicalGroundingProvider {
  readonly providerId = "curated_v1" as const;
  private readonly corpus: readonly CuratedBiblicalEntry[];

  constructor(corpus: readonly CuratedBiblicalEntry[] = CURATED_BIBLICAL_CORPUS_V1) {
    this.corpus = corpus;
  }

  assertCorpusReady(): void {
    if (!this.corpus || this.corpus.length < 1) {
      throw new AppError(
        "biblical_corpus_unavailable",
        "biblical_corpus_unavailable",
        503,
        "O chat está temporariamente indisponível. Tente novamente mais tarde.",
      );
    }

    for (const item of this.corpus) {
      const validation = validateBiblicalReference({
        book: item.book,
        chapter: item.chapter,
        verseStart: item.verseStart,
        verseEnd: item.verseEnd,
      });
      if (!validation.valid || !item.id.trim() || !item.editorialSummary.trim()) {
        throw new AppError(
          "biblical_corpus_invalid",
          "biblical_corpus_invalid",
          503,
          "O chat está temporariamente indisponível. Tente novamente mais tarde.",
        );
      }
    }
  }

  getCorpusSize(): number {
    return this.corpus.length;
  }

  listEntries(): readonly CuratedBiblicalEntry[] {
    return this.corpus;
  }

  retrieve(input: BiblicalRetrievalInput): BiblicalGroundingResult {
    this.assertCorpusReady();

    const limit = Math.min(Math.max(input.limit ?? 4, 3), 5);
    const themes = detectThemes(input.question);
    const seed = hashSeed(
      `${input.varietySeed ?? ""}|${normalize(input.question)}|${input.personaKey}`,
    );

    const eligible = this.corpus.filter((entry) => {
      if (entry.requiresSaintsContent && !input.allowsSaintsContent) {
        return false;
      }
      if (
        input.traditionKey === "evangelical" &&
        entry.requiresSaintsContent
      ) {
        return false;
      }
      return true;
    });

    const scored: RetrievedBiblicalPassage[] = eligible.map((entry) => {
      const { score, matchedThemes } = scoreEntry(
        entry,
        themes,
        input.personaKey,
      );
      const tieBreak = hashSeed(`${seed}:${entry.id}`) % 97;
      return {
        entry,
        score: score * 100 + tieBreak,
        matchedThemes,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Prefer at least some theme matches when available
    const withTheme = scored.filter((s) => s.matchedThemes.length > 0);
    const pool = withTheme.length >= 3 ? withTheme : scored;

    // Deterministic variety: rotate within the top candidate window by seed
    const windowSize = Math.min(12, pool.length);
    const window = pool.slice(0, windowSize);
    const offset = window.length > 0 ? seed % window.length : 0;
    const rotated = [
      ...window.slice(offset),
      ...window.slice(0, offset),
      ...pool.slice(windowSize),
    ];
    const selected = rotated.slice(0, limit);

    // Ensure gospel presence for Jesus persona when relevant themes exist
    if (
      input.personaKey === "jesus" &&
      !selected.some((s) => s.entry.isGospel)
    ) {
      const gospel = pool.find((s) => s.entry.isGospel);
      if (gospel) {
        selected[selected.length - 1] = gospel;
      }
    }

    const unique = new Map<string, RetrievedBiblicalPassage>();
    for (const item of selected) {
      unique.set(item.entry.id, item);
    }
    const retrieved = Array.from(unique.values()).slice(0, limit);

    return {
      groundingProvider: "curated_v1",
      retrieved,
      retrievedReferenceIds: retrieved.map((r) => r.entry.id),
      groundingCount: retrieved.length,
      allowedReferences: retrieved.map((r) => toReference(r.entry)),
    };
  }
}

export const curatedBiblicalProvider = new CuratedBiblicalProvider();

/** Detect themes for tests and diagnostics. */
export function detectBiblicalThemes(question: string): BiblicalTheme[] {
  return detectThemes(question);
}
