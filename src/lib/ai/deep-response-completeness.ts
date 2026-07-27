import { AppError } from "@/lib/safety";

/**
 * Structural completeness for on-demand Aprofundar (preferDeep).
 * Rejects hollow shells: greeting/intro + metadata/footer/refs/CTA without
 * a reflection body. Does not enforce the full ~600-word depth guidance.
 */
export function assessDeepAnswerCompleteness(answer: string): {
  substantive: boolean;
  reason: string | null;
  wordCount: number;
  paragraphCount: number;
  sentenceCount: number;
} {
  const text = answer.replace(/\r\n/g, "\n").trim();
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const paragraphCount = paragraphs.length;
  const sentenceCount = sentences.length;

  if (!text) {
    return {
      substantive: false,
      reason: "empty",
      wordCount,
      paragraphCount,
      sentenceCount,
    };
  }

  // Intro-only / shell: far below deep guidance and lacks body sections.
  if (wordCount < 70) {
    return {
      substantive: false,
      reason: "too_short",
      wordCount,
      paragraphCount,
      sentenceCount,
    };
  }

  const hasBodyStructure = paragraphCount >= 2 || sentenceCount >= 4;
  if (!hasBodyStructure) {
    return {
      substantive: false,
      reason: "missing_body_structure",
      wordCount,
      paragraphCount,
      sentenceCount,
    };
  }

  const first = paragraphs[0] ?? "";
  const openingOnly =
    paragraphCount === 1 &&
    /^(ol[aá]|obrigad|entendo|compreendo|percebo|vejo que|sinto muito)/i.test(
      first,
    ) &&
    wordCount < 150;
  if (openingOnly) {
    return {
      substantive: false,
      reason: "opening_only",
      wordCount,
      paragraphCount,
      sentenceCount,
    };
  }

  return {
    substantive: true,
    reason: null,
    wordCount,
    paragraphCount,
    sentenceCount,
  };
}

export function isDeepAnswerSubstantive(answer: string): boolean {
  return assessDeepAnswerCompleteness(answer).substantive;
}

/** Throw a stable client error — do not persist or bill as successful deep. */
export function assertDeepAnswerSubstantive(answer: string): void {
  const assessment = assessDeepAnswerCompleteness(answer);
  if (assessment.substantive) return;
  throw new AppError(
    `deep_response_incomplete:${assessment.reason ?? "unknown"}`,
    "ai_incomplete",
    503,
    "Não foi possível concluir a reflexão aprofundada agora. Tente novamente ou envie sem Aprofundar.",
  );
}
