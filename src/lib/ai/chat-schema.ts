import { z } from "zod";
import { MAX_CHAT_PERSONA_KEY_LENGTH } from "@/lib/ai/chat-persona";

export const MAX_CHAT_MESSAGE_LENGTH = 4000;

export const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Escreva uma mensagem para continuar.")
    .max(
      MAX_CHAT_MESSAGE_LENGTH,
      `A mensagem pode ter no máximo ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`,
    ),
  conversationId: z.string().uuid().optional().nullable(),
  personaKey: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CHAT_PERSONA_KEY_LENGTH)
    .default("jesus"),
  preferDeep: z.boolean().optional().default(false),
  /** Client-generated UUID reused across retries of the same send. */
  requestId: z.string().uuid().optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  answer: z.string(),
  biblicalReferences: z.array(
    z.object({
      book: z.string(),
      chapter: z.number().int().positive(),
      verseStart: z.number().int().positive(),
      verseEnd: z.number().int().positive().optional(),
    }),
  ),
  interpretationNotice: z.string(),
  followUpQuestion: z.string().optional(),
  usage: z.object({
    level: z.enum(["normal", "elevated", "near_limit", "blocked"]),
    label: z.string(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }),
  requestId: z.string(),
  conversationId: z.string(),
  provider: z.enum(["openai", "mock"]),
  /**
   * Server-classified safety mode for this turn (crisis intercept).
   * Optional so older clients and normal turns stay compatible.
   * Clients must use this marker — not keyword inference on answer text.
   */
  safetyMode: z.enum(["crisis"]).optional(),
});

export type ChatResponsePayload = z.infer<typeof chatResponseSchema>;
