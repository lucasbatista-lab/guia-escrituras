import { z } from "zod";

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
  personaKey: z.string().min(1).default("jesus"),
  preferDeep: z.boolean().optional().default(false),
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
});

export type ChatResponsePayload = z.infer<typeof chatResponseSchema>;
