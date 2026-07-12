import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/ai/chat-schema";

const BLOCKED_PATTERNS: RegExp[] = [
  /(\b)(ignore( previous| all)? instructions)(\b)/i,
  /(\b)(jailbreak)(\b)/i,
];

export function sanitizeUserMessage(message: string): string {
  return message.replace(/\u0000/g, "").trim();
}

export function assertMessageSafe(message: string): {
  ok: boolean;
  error?: string;
} {
  const cleaned = sanitizeUserMessage(message);
  if (!cleaned) {
    return { ok: false, error: "Escreva uma mensagem para continuar." };
  }
  if (cleaned.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `A mensagem pode ter no máximo ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`,
    };
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        ok: false,
        error: "Não foi possível processar esta mensagem. Reformule o texto.",
      };
    }
  }
  return { ok: true };
}
