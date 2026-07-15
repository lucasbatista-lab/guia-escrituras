/**
 * Efficient conversation memory (no second OpenAI call).
 * Summary is produced in the same structured output as the answer.
 */

export const RECENT_CONTEXT_MESSAGE_LIMIT = 4;

/** Max chars for persisted conversationMemory / summary (default 1000). */
export function getConversationMemoryMaxChars(): number {
  const raw = process.env.CONVERSATION_MEMORY_MAX_CHARS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 400 && n <= 2000) return n;
  }
  return 1000;
}

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._\-]+/gi,
  /\b(?:password|senha|token|secret|api[_-]?key)\s*[:=]\s*\S+/gi,
  /\b(?:\d[ -]*?){13,19}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
];

export function sanitizeConversationMemory(
  raw: string,
  maxChars = getConversationMemoryMaxChars(),
): string {
  let text = raw.replace(/\s+/g, " ").trim();
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[redacted]");
  }
  if (text.length > maxChars) {
    text = text.slice(0, maxChars).trim();
  }
  return text;
}

export interface ContextMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type RecentMessageForContext = {
  id?: string;
  role: string;
  content: string;
  requestId?: string | null;
};

/**
 * Select up to N prior messages for the model, excluding the current turn.
 * Exclusion MUST use requestId / message id — never fragile text equality alone.
 * The current user utterance is passed separately as currentUserMessage.
 */
export function selectContextMessages(input: {
  recentChronological: RecentMessageForContext[];
  /** Request id of the in-flight turn (user message already persisted). */
  currentRequestId: string;
  /** Optional persisted message id for the current user utterance. */
  currentMessageId?: string | null;
  limit?: number;
}): ContextMessage[] {
  const limit = input.limit ?? RECENT_CONTEXT_MESSAGE_LIMIT;
  const requestId = input.currentRequestId.trim();
  const messageId = input.currentMessageId?.trim() || null;

  const msgs = input.recentChronological
    .filter((m) => {
      if (messageId && m.id && m.id === messageId) return false;
      if (requestId && m.requestId && m.requestId === requestId) return false;
      return true;
    })
    .map((m) => ({
      role: (m.role === "assistant" || m.role === "system"
        ? m.role
        : "user") as ContextMessage["role"],
      content: m.content,
    }));

  return msgs.slice(-limit);
}

export function buildConversationMemoryPromptGuidance(
  maxChars = getConversationMemoryMaxChars(),
): string[] {
  return [
    "## Memória interna (conversationMemory)",
    "Produza o campo conversationMemory para continuidade da conversa (não é exibido ao usuário).",
    "Inclua somente: situação principal; contexto relevante; preferências/decisões; orientações já oferecidas; ponto ainda aberto.",
    `Texto curto e objetivo, no máximo ${maxChars} caracteres.`,
    "Não copie a resposta inteira. Não invente fatos. Não guarde senhas, cartões, tokens, secrets, documentos ou IDs.",
    "Se houver um resumo anterior no contexto, atualize-o progressivamente com este turno (não recomece do zero sem necessidade).",
  ];
}
