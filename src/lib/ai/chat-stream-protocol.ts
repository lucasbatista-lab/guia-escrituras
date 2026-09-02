import type { ChatResponsePayload } from "./chat-schema";

/**
 * Explicit NDJSON events for POST /api/chat streaming.
 * The client never receives raw model JSON — only human `answer` snapshots
 * and a fully validated `completed` payload.
 */
export type ChatStreamEvent =
  | {
      type: "started";
      requestId: string;
      conversationId: string;
    }
  | {
      type: "assistant_snapshot";
      requestId: string;
      answer: string;
    }
  | {
      type: "completed";
      requestId: string;
      payload: ChatResponsePayload;
    }
  | {
      type: "error";
      requestId: string;
      code: string;
      message: string;
    };

export function encodeChatStreamLine(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseChatStreamLine(line: string): ChatStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const type = (parsed as { type?: unknown }).type;
  if (
    type !== "started" &&
    type !== "assistant_snapshot" &&
    type !== "completed" &&
    type !== "error"
  ) {
    return null;
  }
  return parsed as ChatStreamEvent;
}

export async function consumeChatNdjsonStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new Error("empty_stream");
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        throw new DOMException("Aborted", "AbortError");
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const event = parseChatStreamLine(line);
        if (event) onEvent(event);
        newline = buffer.indexOf("\n");
      }
    }
    const tail = parseChatStreamLine(buffer);
    if (tail) onEvent(tail);
  } finally {
    reader.releaseLock();
  }
}

export function looksLikeStructuredJsonLeak(text: string): boolean {
  const t = text.trimStart();
  if (!t) return false;
  if (t.startsWith("{") || t.startsWith("[")) return true;
  if (t.startsWith('"answer"') || t.startsWith("'answer'")) return true;
  const head = t.slice(0, 96);
  return (
    /"biblicalReferences"\s*:/.test(head) ||
    /"interpretationNotice"\s*:/.test(head) ||
    /"conversationMemory"\s*:/.test(head) ||
    /"followUpQuestion"\s*:/.test(head)
  );
}
