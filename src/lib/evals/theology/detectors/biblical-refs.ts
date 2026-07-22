import { CANONICAL_BOOKS } from "@/lib/biblical/validation";
import type { BiblicalRefHit } from "../schemas";
import { normalizeEvalText } from "./text-utils";
import type { DetectorHit } from "./identity-revelation";

const BOOK_LOOKUP = new Map(
  CANONICAL_BOOKS.map((book) => [normalizeEvalText(book), book] as const),
);

/** Multi-word books first for greedy matching. */
const BOOK_ALIASES: { alias: string; canonical: string }[] = [
  ...[...CANONICAL_BOOKS]
    .map((book) => ({ alias: normalizeEvalText(book), canonical: book }))
    .sort((a, b) => b.alias.length - a.alias.length),
  { alias: "genesis", canonical: "Gênesis" },
  { alias: "exodo", canonical: "Êxodo" },
  { alias: "salmo", canonical: "Salmos" },
  { alias: "psalmos", canonical: "Salmos" },
  { alias: "apocalipse de joao", canonical: "Apocalipse" },
];

const REF_PATTERN =
  /\b((?:[1-3]\s*)?[a-zà-ú]+(?:\s+[a-zà-ú]+){0,2})\s+(\d{1,3})\s*[:，,]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\b/gi;

function resolveBook(rawBook: string): { book: string; canonical: boolean } {
  const key = normalizeEvalText(rawBook);
  for (const entry of BOOK_ALIASES) {
    if (key === entry.alias || key.endsWith(` ${entry.alias}`)) {
      return { book: entry.canonical, canonical: true };
    }
  }
  const direct = BOOK_LOOKUP.get(key);
  if (direct) return { book: direct, canonical: true };
  return { book: rawBook.trim(), canonical: false };
}

export function extractBiblicalReferencesFromText(answer: string): BiblicalRefHit[] {
  const hits: BiblicalRefHit[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(REF_PATTERN.source, REF_PATTERN.flags);
  while ((m = re.exec(answer)) !== null) {
    const rawBook = m[1] ?? "";
    const chapter = Number(m[2]);
    const verseStart = Number(m[3]);
    const verseEnd = m[4] ? Number(m[4]) : undefined;
    if (!Number.isFinite(chapter) || !Number.isFinite(verseStart)) continue;
    const resolved = resolveBook(rawBook);
    // Skip accidental matches like "passo 1:2" / "dia 3:4"
    if (
      !resolved.canonical &&
      /^(passo|dia|item|ponto|etapa|hora|minuto|versao|versao)\b/i.test(
        normalizeEvalText(rawBook),
      )
    ) {
      continue;
    }
    const key = `${resolved.book}:${chapter}:${verseStart}:${verseEnd ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      raw: m[0],
      book: resolved.book,
      chapter,
      verseStart,
      ...(verseEnd != null ? { verseEnd } : {}),
      canonical: resolved.canonical,
    });
  }
  return hits;
}

function refsLooselyEqual(
  a: Pick<BiblicalRefHit, "book" | "chapter" | "verseStart" | "verseEnd">,
  b: Pick<BiblicalRefHit, "book" | "chapter" | "verseStart" | "verseEnd">,
): boolean {
  const aEnd = a.verseEnd ?? a.verseStart;
  const bEnd = b.verseEnd ?? b.verseStart;
  return (
    normalizeEvalText(a.book) === normalizeEvalText(b.book) &&
    a.chapter === b.chapter &&
    a.verseStart === b.verseStart &&
    aEnd === bEnd
  );
}

export function classifyBiblicalReferences(input: {
  answer: string;
  structuredRefs: {
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number | null;
  }[];
  allowedRefs: {
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number | null;
  }[];
}): {
  detected: BiblicalRefHit[];
  allowed: BiblicalRefHit[];
  invalid: BiblicalRefHit[];
  unretrieved: BiblicalRefHit[];
  fabricatedHit: DetectorHit | null;
  unretrievedHit: DetectorHit | null;
} {
  const fromText = extractBiblicalReferencesFromText(input.answer);
  const fromStructured: BiblicalRefHit[] = input.structuredRefs.map((ref) => {
    const resolved = resolveBook(ref.book);
    return {
      raw: `${ref.book} ${ref.chapter}:${ref.verseStart}`,
      book: resolved.canonical ? resolved.book : ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
      canonical: resolved.canonical,
    };
  });

  const detectedMap = new Map<string, BiblicalRefHit>();
  for (const hit of [...fromText, ...fromStructured]) {
    const key = `${normalizeEvalText(hit.book)}:${hit.chapter}:${hit.verseStart}:${hit.verseEnd ?? ""}`;
    detectedMap.set(key, hit);
  }
  const detected = [...detectedMap.values()];

  const allowed: BiblicalRefHit[] = input.allowedRefs.map((ref) => {
    const resolved = resolveBook(ref.book);
    return {
      raw: `${ref.book} ${ref.chapter}:${ref.verseStart}`,
      book: resolved.canonical ? resolved.book : ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
      canonical: resolved.canonical,
    };
  });

  const invalid = detected.filter((hit) => !hit.canonical);
  const unretrieved =
    allowed.length === 0
      ? []
      : detected.filter(
          (hit) =>
            hit.canonical && !allowed.some((a) => refsLooselyEqual(a, hit)),
        );

  const fabricatedHit =
    invalid.length > 0
      ? {
          ruleHint: "no_fabricated_biblical_refs",
          evidence: invalid.slice(0, 4).map((h) => h.raw),
        }
      : null;

  const unretrievedHit =
    unretrieved.length > 0
      ? {
          ruleHint: "no_unretrieved_biblical_refs",
          evidence: unretrieved.slice(0, 4).map((h) => h.raw),
        }
      : null;

  return {
    detected,
    allowed,
    invalid,
    unretrieved,
    fabricatedHit,
    unretrievedHit,
  };
}

/**
 * Eval-only: refs explicitly present in free-text that are absent from the
 * structured `biblicalReferences` array. Documents MAE-P1-09 divergence —
 * not used as a live chat gate (false-positive risk).
 * Evidence strings are short `raw` matches only; callers must not log full answers.
 */
export function findFreeTextRefsAbsentFromStructured(input: {
  answer: string;
  structuredRefs: {
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number | null;
  }[];
}): BiblicalRefHit[] {
  const fromText = extractBiblicalReferencesFromText(input.answer);
  const structured: BiblicalRefHit[] = input.structuredRefs.map((ref) => {
    const resolved = resolveBook(ref.book);
    return {
      raw: `${ref.book} ${ref.chapter}:${ref.verseStart}`,
      book: resolved.canonical ? resolved.book : ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
      canonical: resolved.canonical,
    };
  });
  return fromText.filter(
    (hit) => !structured.some((s) => refsLooselyEqual(s, hit)),
  );
}

export function detectFalseLiteralCitation(answer: string): DetectorHit | null {
  const text = normalizeEvalText(answer);
  const patterns: RegExp[] = [
    /\bcitacao literal\b/,
    /\ba biblia diz literalmente\b/,
    /\bdiz a biblia que\b/,
    /\bconforme a traducao\b/,
    /\btexto literal da escritura\b/,
  ];
  const evidence: string[] = [];
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (m && m.index != null) {
      // Negated forms already handled loosely: "não é citação literal"
      const before = text.slice(Math.max(0, m.index - 24), m.index);
      if (/\b(nao|nunca|sem|nao e|nao e uma)\b/.test(before)) continue;
      evidence.push(m[0]);
    }
  }
  const quoted = answer.match(/[“"]([^”"]{40,})[”"]/g);
  if (quoted && quoted.length >= 2) {
    evidence.push("multiplas aspas longas sugerindo citacao literal");
  }
  if (evidence.length === 0) return null;
  return { ruleHint: "no_false_literal_citation", evidence: evidence.slice(0, 4) };
}
