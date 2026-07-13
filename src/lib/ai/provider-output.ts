import { z } from "zod";
import { AppError } from "@/lib/safety";

export const MAX_AI_ANSWER_LENGTH = 12_000;

const biblicalReferenceSchema = z
  .object({
    book: z.string().trim().min(1).max(80),
    chapter: z.number().int().positive().max(200),
    verseStart: z.number().int().positive().max(200),
    verseEnd: z.number().int().positive().max(200).nullish(),
    translation: z.string().trim().max(40).nullish(),
  })
  .strict();

/**
 * Structured payload expected from the AI provider (content only).
 */
export const aiProviderContentSchema = z
  .object({
    answer: z
      .string()
      .trim()
      .min(1, "Resposta vazia.")
      .max(MAX_AI_ANSWER_LENGTH, "Resposta excessivamente longa."),
    biblicalReferences: z.array(biblicalReferenceSchema).max(20),
    interpretationNotice: z.string().trim().min(1).max(2000),
    followUpQuestion: z.string().trim().max(500).nullish(),
  })
  .strict();

export type AiProviderContent = z.infer<typeof aiProviderContentSchema>;

/** JSON Schema for OpenAI Responses structured outputs (strict subset). */
export const AI_PROVIDER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "answer",
    "biblicalReferences",
    "interpretationNotice",
    "followUpQuestion",
  ],
  properties: {
    answer: { type: "string", minLength: 1, maxLength: MAX_AI_ANSWER_LENGTH },
    biblicalReferences: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["book", "chapter", "verseStart", "verseEnd", "translation"],
        properties: {
          book: { type: "string", minLength: 1, maxLength: 80 },
          chapter: { type: "integer", minimum: 1, maximum: 200 },
          verseStart: { type: "integer", minimum: 1, maximum: 200 },
          verseEnd: { type: ["integer", "null"] },
          translation: { type: ["string", "null"] },
        },
      },
    },
    interpretationNotice: { type: "string", minLength: 1, maxLength: 2000 },
    followUpQuestion: { type: ["string", "null"] },
  },
} as const;

const FORBIDDEN_IDENTITY =
  /\b(eu sou jesus|sou o próprio jesus|eu sou deus|sou deus|esta é uma revelação sobrenatural|recebi uma revelação divina)\b/i;

export function assertSafeAiIdentity(content: AiProviderContent): void {
  const haystack = `${content.answer}\n${content.interpretationNotice}`;
  if (FORBIDDEN_IDENTITY.test(haystack)) {
    throw new AppError(
      "ai_identity_violation",
      "ai_identity_violation",
      503,
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    );
  }
}

/**
 * Validates provider output. Does not use regex as the primary parser —
 * expects JSON text (from structured outputs or a plain JSON string).
 */
export function parseAndValidateAiProviderContent(raw: string): AiProviderContent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(
      "ai_invalid_output",
      "ai_invalid_output",
      503,
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    );
  }

  const result = aiProviderContentSchema.safeParse(parsed);
  if (!result.success) {
    throw new AppError(
      "ai_invalid_output",
      "ai_invalid_output",
      503,
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    );
  }

  assertSafeAiIdentity(result.data);
  return result.data;
}
