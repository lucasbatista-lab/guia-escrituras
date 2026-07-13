import type { BiblicalReference } from "./types";
import type { BiblicalGroundingResult } from "./curated-types";
import { logger } from "@/lib/logging/logger";

function refsEqual(a: BiblicalReference, b: BiblicalReference): boolean {
  const aEnd = a.verseEnd ?? a.verseStart;
  const bEnd = b.verseEnd ?? b.verseStart;
  return (
    a.book.trim().toLowerCase() === b.book.trim().toLowerCase() &&
    a.chapter === b.chapter &&
    a.verseStart === b.verseStart &&
    aEnd === bEnd
  );
}

/**
 * Keeps only biblical references that were retrieved for this request.
 * Invented references are dropped and logged securely (never shown to the user).
 */
export function filterReferencesToGrounding(
  proposed: BiblicalReference[],
  grounding: BiblicalGroundingResult,
  requestId?: string,
): {
  accepted: BiblicalReference[];
  rejectedCount: number;
} {
  const allowed = grounding.allowedReferences;
  const accepted: BiblicalReference[] = [];
  let rejectedCount = 0;

  for (const ref of proposed) {
    const match = allowed.find((a) => refsEqual(a, ref));
    if (match) {
      // Prefer the curated shape (no translation guess from the model)
      accepted.push({
        book: match.book,
        chapter: match.chapter,
        verseStart: match.verseStart,
        ...(match.verseEnd != null ? { verseEnd: match.verseEnd } : {}),
      });
    } else {
      rejectedCount += 1;
    }
  }

  if (rejectedCount > 0) {
    logger.error("biblical_reference_outside_grounding", {
      requestId,
      rejectedCount,
      groundingCount: grounding.groundingCount,
    });
  }

  // If the model returned nothing valid, fall back to the retrieved set (capped)
  if (accepted.length === 0 && allowed.length > 0) {
    return {
      accepted: allowed.slice(0, Math.min(3, allowed.length)),
      rejectedCount: rejectedCount + (proposed.length === 0 ? 0 : 0),
    };
  }

  return { accepted, rejectedCount };
}

/**
 * Soft guard: answer must not present editorial paraphrase as a literal
 * quotation of Scripture (e.g. long quoted blocks claiming Bible text).
 */
export function answerLooksLikeLiteralUnlicensedQuote(answer: string): boolean {
  // Multiple long quoted spans are a strong signal of presenting text as citation
  const quoted = answer.match(/[“"]([^”"]{40,})[”"]/g);
  if (quoted && quoted.length >= 2) return true;

  const claimPatterns =
    /\b(diz a bíblia que|a bíblia diz literalmente|citação literal|conforme a tradução)\b/i;
  return claimPatterns.test(answer);
}

export function buildGroundingPromptSection(
  grounding: BiblicalGroundingResult,
): string[] {
  const lines: string[] = [
    "## Fundamentação bíblica recuperada (curated_v1)",
    "Use SOMENTE as referências abaixo. Não invente versículos.",
    "Os resumos são paráfrases editoriais — nunca os apresente como citação literal de uma tradução.",
    "Não use aspas para texto bíblico sem fonte textual licenciada.",
    "Prefira expressões como “em síntese”, “a passagem ensina” ou “à luz desse texto”.",
    "Separe interpretação de aplicação prática.",
    "Reconheça quando tradições interpretam o tema de formas distintas, se houver nota.",
    "Nunca fale como se fosse literalmente Jesus; nunca alegue revelação sobrenatural.",
    "",
  ];

  for (const item of grounding.retrieved) {
    const { entry } = item;
    lines.push(`### ${entry.formattedReference} (${entry.id})`);
    lines.push(`Temas: ${entry.themes.join(", ")}`);
    lines.push(`Resumo editorial: ${entry.editorialSummary}`);
    lines.push(`Contexto: ${entry.contextNote}`);
    if (entry.denominationalNotes) {
      lines.push(`Nota denominacional: ${entry.denominationalNotes}`);
    }
    lines.push("");
  }

  return lines;
}
