import type { BiblicalReference } from "@/lib/biblical";
import { formatBiblicalReference } from "@/lib/biblical";

const TECHNICAL_PUBLIC_PATTERNS: RegExp[] = [
  /A resposta foi salva;?\s*a memória da conversa pode atrasar\.?/gi,
  /A resposta foi gerada,?\s*mas a persistência ficou incompleta\.?/gi,
  /Uso registrado parcialmente;?\s*totais mensais podem atrasar\.?/gi,
  /\(\s*A resposta foi[^)]*\)/gi,
  /\brequestId\b|\brequest_id\b/gi,
];

/** Literal structured-field labels that must never appear in the public body. */
const STRUCTURED_FIELD_LABEL_PATTERNS: RegExp[] = [
  /^\s*interpretation\s*notice\s*:?\s*$/gim,
  /^\s*interpretationNotice\s*:?\s*$/gim,
  /^\s*follow\s*up\s*question\s*:?\s*$/gim,
  /^\s*followUpQuestion\s*:?\s*$/gim,
  /^\s*conversation\s*memory\s*:?\s*$/gim,
  /^\s*conversationMemory\s*:?\s*$/gim,
  /^\s*biblicalReferences\s*:?\s*$/gim,
  /^\s*references\s*:?\s*$/gim,
  /\binterpretationNotice\s*:\s*/gi,
  /\bInterpretation\s+notice\s*:\s*/gi,
  /\bfollowUpQuestion\s*:\s*/gi,
  /\bFollow[- ]?up\s+question\s*:\s*/gi,
  /\bconversationMemory\s*:\s*/gi,
  /\bConversation\s+memory\s*:\s*/gi,
  /\bbiblicalReferences\s*:\s*/gi,
];

function stripTrailingBlock(source: string, block: string): string {
  const trimmedBlock = block.trim();
  if (!trimmedBlock) return source;
  let out = source.trimEnd();
  if (out.endsWith(trimmedBlock)) {
    out = out.slice(0, -trimmedBlock.length).trimEnd();
  }
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
  while (out.includes(trimmedBlock)) {
    const next = out.replace(trimmedBlock, "").replace(/\n{3,}/g, "\n\n").trim();
    if (next === out.trim()) break;
    out = next;
  }
  return out;
}

function stripStructuredFieldLabels(source: string): string {
  let out = source;
  for (const pattern of STRUCTURED_FIELD_LABEL_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** True when notice has no user-visible content (or is only an internal label). */
export function hasRenderableInterpretationNotice(
  value: string | null | undefined,
): boolean {
  const cleaned = stripStructuredFieldLabels((value ?? "").trim());
  if (!cleaned) return false;
  // Reject placeholders that are just the field name again
  if (/^interpretation\s*notice:?$/i.test(cleaned)) return false;
  if (/^interpretationNotice:?$/i.test(cleaned)) return false;
  return cleaned.length >= 8;
}

export function hasRenderableFollowUpQuestion(
  value: string | null | undefined,
): boolean {
  const cleaned = stripStructuredFieldLabels((value ?? "").trim());
  if (!cleaned) return false;
  if (/^followUpQuestion:?$/i.test(cleaned)) return false;
  if (/^follow[- ]?up\s+question:?$/i.test(cleaned)) return false;
  return cleaned.length >= 4;
}

/**
 * Enforce UI contract: answer body must not repeat structured fields rendered
 * separately, nor leak internal labels / persistence warnings.
 * Empty notices/questions become absent (caller must not render them).
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
  let answer = stripStructuredFieldLabels(
    input.answer.replace(/\r\n/g, "\n").trim(),
  );
  let interpretationNotice = stripStructuredFieldLabels(
    (input.interpretationNotice ?? "").trim(),
  );
  let followUp = stripStructuredFieldLabels(
    (input.followUpQuestion ?? "").trim(),
  );

  for (const pattern of TECHNICAL_PUBLIC_PATTERNS) {
    answer = answer.replace(pattern, "").trim();
    interpretationNotice = interpretationNotice.replace(pattern, "").trim();
    followUp = followUp.replace(pattern, "").trim();
  }

  interpretationNotice = interpretationNotice
    .replace(/\s{2,}/g, " ")
    .replace(/\s*\(\s*\)\s*/g, " ")
    .trim();
  followUp = followUp.replace(/\s{2,}/g, " ").trim();

  if (!hasRenderableInterpretationNotice(interpretationNotice)) {
    interpretationNotice = "";
  }
  if (!hasRenderableFollowUpQuestion(followUp)) {
    followUp = "";
  }

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

  // Final pass: labels that may remain after content stripping
  answer = stripStructuredFieldLabels(answer);

  return {
    answer,
    interpretationNotice,
    ...(followUp ? { followUpQuestion: followUp } : {}),
  };
}
