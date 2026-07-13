import { describe, expect, it } from "vitest";
import {
  CURATED_BIBLICAL_CORPUS_V1,
  CuratedBiblicalProvider,
  createBiblicalGroundingProvider,
  filterReferencesToGrounding,
  answerLooksLikeLiteralUnlicensedQuote,
  validateBiblicalReference,
  MockBiblicalSourceProvider,
  detectBiblicalThemes,
} from "@/lib/biblical";
import { AppError } from "@/lib/safety";
import type { BiblicalTheme } from "@/lib/biblical";

const REQUIRED_THEMES: BiblicalTheme[] = [
  "ansiedade",
  "medo",
  "mudanca",
  "luto",
  "esperanca",
  "perdao",
  "culpa",
  "raiva",
  "familia",
  "relacionamentos",
  "solidao",
  "decisoes",
  "trabalho",
  "dinheiro",
  "proposito",
  "sofrimento",
  "oracao",
  "fe",
  "recomeco",
  "servico",
  "amor_ao_proximo",
  "conflitos",
  "tentacao",
  "gratidao",
  "perseveranca",
];

describe("curated biblical corpus", () => {
  it("has at least 50 references", () => {
    expect(CURATED_BIBLICAL_CORPUS_V1.length).toBeGreaterThanOrEqual(50);
  });

  it("covers required pastoral themes", () => {
    const present = new Set(
      CURATED_BIBLICAL_CORPUS_V1.flatMap((e) => e.themes),
    );
    for (const theme of REQUIRED_THEMES) {
      expect(present.has(theme)).toBe(true);
    }
  });

  it("contains only valid canonical references", () => {
    for (const entry of CURATED_BIBLICAL_CORPUS_V1) {
      const result = validateBiblicalReference({
        book: entry.book,
        chapter: entry.chapter,
        verseStart: entry.verseStart,
        verseEnd: entry.verseEnd,
      });
      expect(result.valid, entry.id).toBe(true);
      expect(entry.editorialSummary.length).toBeGreaterThan(20);
      expect(entry.editorialSummary).not.toMatch(/^“[^”]{80,}”$/);
    }
  });

  it("labels summaries as editorial paraphrases, not licensed quotes", () => {
    for (const entry of CURATED_BIBLICAL_CORPUS_V1) {
      expect(entry.editorialSummary.toLowerCase()).not.toContain(
        "versão nvi",
      );
      expect(entry.editorialSummary.toLowerCase()).not.toContain("ara:");
    }
  });
});

describe("curated retrieval", () => {
  const provider = new CuratedBiblicalProvider();

  it("retrieves pertinent references for anxiety", () => {
    const result = provider.retrieve({
      question: "Estou muito ansioso com o futuro e não consigo dormir.",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "seed-ansiedade",
    });
    expect(result.groundingCount).toBeGreaterThanOrEqual(3);
    expect(result.groundingCount).toBeLessThanOrEqual(5);
    const themes = result.retrieved.flatMap((r) => r.entry.themes);
    expect(themes).toContain("ansiedade");
    expect(detectBiblicalThemes("Estou muito ansioso")).toContain("ansiedade");
  });

  it("retrieves pertinent references for forgiveness", () => {
    const result = provider.retrieve({
      question: "Como posso perdoar alguém que me magoou profundamente?",
      traditionKey: "evangelical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "seed-perdao",
    });
    const themes = result.retrieved.flatMap((r) => r.entry.themes);
    expect(themes).toContain("perdao");
  });

  it("retrieves pertinent references for grief", () => {
    const result = provider.retrieve({
      question: "Estou em luto pela morte de um ente querido.",
      traditionKey: "catholic",
      personaKey: "jesus",
      allowsSaintsContent: true,
      varietySeed: "seed-luto",
    });
    const themes = result.retrieved.flatMap((r) => r.entry.themes);
    expect(themes).toContain("luto");
  });

  it("retrieves for change and new beginnings", () => {
    const result = provider.retrieve({
      question: "Estou em uma grande mudança e quero um recomeço de vida.",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "seed-mudanca",
    });
    const themes = new Set(result.retrieved.flatMap((r) => r.entry.themes));
    expect(themes.has("mudanca") || themes.has("recomeco")).toBe(true);
  });

  it("retrieves for money concerns", () => {
    const result = provider.retrieve({
      question: "Estou preocupado com dinheiro e dívidas.",
      traditionKey: "evangelical",
      personaKey: "paulo",
      allowsSaintsContent: false,
      varietySeed: "seed-dinheiro",
    });
    const themes = result.retrieved.flatMap((r) => r.entry.themes);
    expect(themes).toContain("dinheiro");
  });

  it("blocks saints-oriented content for evangelical tradition", () => {
    const result = provider.retrieve({
      question: "Quero agradecer a Deus com gratidão e oração como Maria.",
      traditionKey: "evangelical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "seed-evangelical",
    });
    expect(
      result.retrieved.every((r) => !r.entry.requiresSaintsContent),
    ).toBe(true);
  });

  it("may include Magnificat-related entry when saints allowed", () => {
    const result = provider.retrieve({
      question: "Quero viver gratidão e fé como no cântico de Maria.",
      traditionKey: "catholic",
      personaKey: "maria",
      allowsSaintsContent: true,
      varietySeed: "seed-catholic-maria",
      limit: 5,
    });
    // Not required to always rank first, but corpus entry must remain available
    const corpusHas = CURATED_BIBLICAL_CORPUS_V1.some(
      (e) => e.requiresSaintsContent,
    );
    expect(corpusHas).toBe(true);
    expect(result.groundingProvider).toBe("curated_v1");
  });

  it("prioritizes Gospels for Jesus persona when relevant", () => {
    const result = provider.retrieve({
      question: "Estou cansado e ansioso; preciso de descanso.",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "seed-jesus-gospel",
    });
    expect(result.retrieved.some((r) => r.entry.isGospel)).toBe(true);
  });

  it("varies selection across different seeds", () => {
    const a = provider.retrieve({
      question: "Preciso de fé e esperança para perseverar.",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "aaa",
      limit: 4,
    });
    const b = provider.retrieve({
      question: "Preciso de fé e esperança para perseverar.",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "zzz",
      limit: 4,
    });
    // Same question may share some refs, but seed tie-break should not always be identical
    expect(a.retrievedReferenceIds.join("|")).not.toBe(
      b.retrievedReferenceIds.join("|"),
    );
  });
});

describe("grounding validation", () => {
  const provider = new CuratedBiblicalProvider();
  const grounding = provider.retrieve({
    question: "Estou ansioso e preciso de paz.",
    traditionKey: "ecumenical",
    personaKey: "jesus",
    allowsSaintsContent: false,
    varietySeed: "val",
  });

  it("rejects references outside the retrieved set", () => {
    const { accepted, rejectedCount } = filterReferencesToGrounding(
      [
        { book: "Jonas", chapter: 2, verseStart: 1 },
        grounding.allowedReferences[0]!,
      ],
      grounding,
      "req-1",
    );
    expect(rejectedCount).toBe(1);
    expect(
      accepted.every((r) =>
        grounding.allowedReferences.some(
          (a) =>
            a.book === r.book &&
            a.chapter === r.chapter &&
            a.verseStart === r.verseStart,
        ),
      ),
    ).toBe(true);
  });

  it("flags literal-style unlicensed quote presentation", () => {
    expect(
      answerLooksLikeLiteralUnlicensedQuote(
        'A Bíblia diz literalmente: "trecho inventado muito longo para parecer citação oficial da escritura sagrada sem licença" e também "outro trecho igualmente longo fingindo ser tradução moderna licenciada do texto".',
      ),
    ).toBe(true);
    expect(
      answerLooksLikeLiteralUnlicensedQuote(
        "Em síntese, a passagem ensina confiança sem apresentar aspas de tradução.",
      ),
    ).toBe(false);
  });
});

describe("production biblical provider", () => {
  it("uses curated_v1 and never MockBiblicalSourceProvider", () => {
    const provider = createBiblicalGroundingProvider();
    expect(provider.providerId).toBe("curated_v1");
    expect(provider).toBeInstanceOf(CuratedBiblicalProvider);
    expect(provider).not.toBeInstanceOf(MockBiblicalSourceProvider);
  });

  it("fails safely when corpus cannot be loaded", () => {
    const empty = new CuratedBiblicalProvider([]);
    expect(() => empty.assertCorpusReady()).toThrow(AppError);
    expect(() =>
      empty.retrieve({
        question: "ansiedade",
        traditionKey: "ecumenical",
        personaKey: "jesus",
        allowsSaintsContent: false,
      }),
    ).toThrow(AppError);
  });
});
