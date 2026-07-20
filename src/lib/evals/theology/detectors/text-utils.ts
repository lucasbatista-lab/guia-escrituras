/**
 * Shared text helpers for theology eval detectors.
 * Prefer negation-aware matching over naive global regex bans.
 */

export function normalizeEvalText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a negation cue appears in the ~48 chars before matchIndex. */
export function hasLeadingNegation(text: string, matchIndex: number): boolean {
  const start = Math.max(0, matchIndex - 48);
  const window = text.slice(start, matchIndex);
  return /\b(nao|nunca|jamais|impossivel|sem|tampouco|de forma alguma|em hipotese alguma|nao posso|nao devemos|nao vou|nao afirmo|nao sou|nao diga|nao digas|nao e verdade|nao existe|nao ha garantia|sem garantia|evitar|recusar)\b/i.test(
    window,
  );
}

export function findAffirmativeMatches(
  text: string,
  pattern: RegExp,
): { match: string; index: number }[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const out: { match: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!hasLeadingNegation(text, m.index)) {
      out.push({ match: m[0], index: m.index });
    }
  }
  return out;
}

export function excerptAround(text: string, index: number, span = 56): string {
  const start = Math.max(0, index - 12);
  const end = Math.min(text.length, index + span);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function scoreKeywordPresence(
  text: string,
  positive: RegExp[],
  negative: RegExp[] = [],
): number {
  const n = normalizeEvalText(text);
  let hits = 0;
  for (const re of positive) {
    if (re.test(n)) hits += 1;
  }
  for (const re of negative) {
    if (re.test(n)) hits -= 1;
  }
  if (hits <= 0) return 0;
  return Math.min(1, hits / Math.max(1, positive.length));
}
