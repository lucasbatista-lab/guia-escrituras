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

/**
 * Select up to N prior messages for the model, excluding the current user
 * utterance (sent separately as “pergunta atual”).
 */
export function selectContextMessages(input: {
  recentChronological: Array<{
    role: string;
    content: string;
  }>;
  currentUserMessage: string;
  limit?: number;
}): ContextMessage[] {
  const limit = input.limit ?? RECENT_CONTEXT_MESSAGE_LIMIT;
  let msgs = input.recentChronological.map((m) => ({
    role: (m.role === "assistant" || m.role === "system"
      ? m.role
      : "user") as ContextMessage["role"],
    content: m.content,
  }));

  const last = msgs[msgs.length - 1];
  if (
    last?.role === "user" &&
    last.content.trim() === input.currentUserMessage.trim()
  ) {
    msgs = msgs.slice(0, -1);
  }

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
