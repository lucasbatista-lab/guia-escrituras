import type { BiblicalReference } from "@/lib/biblical";
import { formatBiblicalReference } from "@/lib/biblical";

const TECHNICAL_PUBLIC_PATTERNS: RegExp[] = [
  /A resposta foi salva;?\s*a memória da conversa pode atrasar\.?/gi,
  /A resposta foi gerada,?\s*mas a persistência ficou incompleta\.?/gi,
  /Uso registrado parcialmente;?\s*totais mensais podem atrasar\.?/gi,
  /\(\s*A resposta foi[^)]*\)/gi,
  /requestId|request_id/gi,
];

function stripTrailingBlock(source: string, block: string): string {
  const trimmedBlock = block.trim();
  if (!trimmedBlock) return source;
  let out = source.trimEnd();
  if (out.endsWith(trimmedBlock)) {
    out = out.slice(0, -trimmedBlock.length).trimEnd();
  }
  // Also strip when block is the last paragraph
  const paragraphs = out.split(/\n{2,}/);
  if (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1]?.trim() ?? "";
    if (last === trimmedBlock) {
      out = paragraphs.slice(0, -1).join("\n\n").trimEnd();
    }
  }
  return out;
}

function stripExactOccurrences(source: string, block: string): string {
  const trimmedBlock = block.trim();
  if (!trimmedBlock || trimmedBlock.length < 12) return source;
  let out = source;
  // Remove duplicated full notice/question when embedded mid-body (once or twice).
  while (out.includes(trimmedBlock)) {
    const next = out.replace(trimmedBlock, "").replace(/\n{3,}/g, "\n\n").trim();
    if (next === out.trim()) break;
    out = next;
  }
  return out;
}

/**
 * Enforce UI contract: answer body must not repeat structured fields rendered
 * separately (references, interpretationNotice, followUpQuestion), nor leak
 * internal persistence / memory warnings to the public surface.
 */
export function normalizeAssistantPresentation(input: {
  answer: string;
  interpretationNotice: string;
  followUpQuestion?: string | null;
  biblicalReferences: BiblicalReference[];
}): {
  answer: string;
  interpretationNotice: string;
  followUpQuestion?: string;
} {
  let answer = input.answer.replace(/\r\n/g, "\n").trim();
  let interpretationNotice = input.interpretationNotice.trim();
  const followUp = input.followUpQuestion?.trim() || undefined;

  for (const pattern of TECHNICAL_PUBLIC_PATTERNS) {
    answer = answer.replace(pattern, "").trim();
    interpretationNotice = interpretationNotice.replace(pattern, "").trim();
  }

  interpretationNotice = interpretationNotice
    .replace(/\s{2,}/g, " ")
    .replace(/\s*\(\s*\)\s*/g, " ")
    .trim();

  if (followUp) {
    answer = stripTrailingBlock(answer, followUp);
    answer = stripExactOccurrences(answer, followUp);
  }

  if (interpretationNotice) {
    answer = stripTrailingBlock(answer, interpretationNotice);
    answer = stripExactOccurrences(answer, interpretationNotice);
  }

  if (input.biblicalReferences.length > 0) {
    const joined = input.biblicalReferences
      .map((ref) => formatBiblicalReference(ref))
      .join(" · ");
    const labelVariants = [
      `Referências · ${joined}`,
      `Referências: ${joined}`,
      joined,
    ];
    for (const variant of labelVariants) {
      answer = stripTrailingBlock(answer, variant);
    }
  }

  answer = answer.replace(/\n{3,}/g, "\n\n").trim();

  return {
    answer,
    interpretationNotice:
      interpretationNotice ||
      "As referências são apresentadas em síntese pastoral, não como citação literal licenciada.",
    ...(followUp ? { followUpQuestion: followUp } : {}),
  };
}
