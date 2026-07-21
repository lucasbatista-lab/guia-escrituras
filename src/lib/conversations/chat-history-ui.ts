import type { BiblicalReference } from "@/lib/biblical";
import type { MessageRecord } from "@/lib/database/repositories/types";

/** UI message shape shared by ChatPanel and server load mapping. */
export type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    biblicalReferences?: BiblicalReference[];
    interpretationNotice?: string;
    followUpQuestion?: string;
    /** Session-only: this assistant turn used Aprofundar (not persisted). */
    deepened?: boolean;
  };
};

/**
 * Map persisted messages into chat UI rows.
 * Skips system roles; restores biblical refs for assistants (notice/follow-up
 * are not stored on MessageRecord — schema limitation, no migration).
 */
export function mapStoredMessagesToUi(
  messages: ReadonlyArray<
    Pick<MessageRecord, "id" | "role" | "content" | "biblicalReferences">
  >,
): ChatUiMessage[] {
  const out: ChatUiMessage[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") {
      out.push({ id: m.id, role: "user", content: m.content });
      continue;
    }
    const refs = m.biblicalReferences ?? [];
    out.push({
      id: m.id,
      role: "assistant",
      content: m.content,
      meta: refs.length > 0 ? { biblicalReferences: refs } : undefined,
    });
  }
  return out;
}

/** Stable assistant bubble id for a turn requestId. */
export function assistantMessageId(requestId: string): string {
  return `${requestId}-assistant`;
}

/**
 * Append assistant bubble unless the same requestId already painted one
 * (idempotent retry / double paint guard).
 */
export function appendAssistantUiMessage(
  prev: ChatUiMessage[],
  input: {
    requestId: string;
    answer: string;
    biblicalReferences?: BiblicalReference[];
    interpretationNotice?: string;
    followUpQuestion?: string;
    deepened?: boolean;
  },
): ChatUiMessage[] {
  const id = assistantMessageId(input.requestId);
  if (prev.some((m) => m.id === id && m.role === "assistant")) {
    return prev;
  }
  return [
    ...prev,
    {
      id,
      role: "assistant",
      content: input.answer,
      meta: {
        biblicalReferences: input.biblicalReferences,
        interpretationNotice: input.interpretationNotice,
        followUpQuestion: input.followUpQuestion,
        deepened: input.deepened || undefined,
      },
    },
  ];
}

/**
 * Remove optimistic user bubble when the send is not retryable with the
 * same requestId (auth, subscription, deep denied, etc.).
 */
export function rollbackOptimisticUserMessage(
  prev: ChatUiMessage[],
  requestId: string,
): ChatUiMessage[] {
  return prev.filter((m) => !(m.id === requestId && m.role === "user"));
}

/**
 * Build /conversar URL with conversation id, dropping one-shot prefill params.
 */
export function conversationChatPath(conversationId: string): string {
  return `/conversar?c=${encodeURIComponent(conversationId)}`;
}

/**
 * Sync browser URL to the active conversation without remounting the panel.
 * Drops tema/jornada/etapa once the thread exists.
 */
export function syncConversationUrl(conversationId: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const current = url.searchParams.get("c");
  if (current === conversationId) {
    // Still strip one-shot prefill params if present.
    if (
      !url.searchParams.has("tema") &&
      !url.searchParams.has("jornada") &&
      !url.searchParams.has("etapa")
    ) {
      return;
    }
  }
  url.searchParams.set("c", conversationId);
  url.searchParams.delete("tema");
  url.searchParams.delete("jornada");
  url.searchParams.delete("etapa");
  const next = `${url.pathname}?${url.searchParams.toString()}`;
  window.history.replaceState(window.history.state, "", next);
}
