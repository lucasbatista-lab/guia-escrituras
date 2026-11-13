import { WHATSAPP_INBOUND_TEXT_MAX } from "@/lib/whatsapp/config";

/**
 * Pure Meta Cloud API payload normalizer — no DB, auth, Stripe, or OpenAI.
 * Only text inbound messages become NormalizedWhatsAppTextMessage.
 */

export type NormalizedWhatsAppTextMessage = {
  providerMessageId: string;
  externalSenderId: string;
  messageType: "text";
  text: string;
  receivedAt: Date;
};

export type NormalizeResult =
  | { kind: "messages"; messages: NormalizedWhatsAppTextMessage[] }
  | { kind: "ignored"; reason: string };

const MAX_MESSAGES_PER_PAYLOAD = 20;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseTimestamp(raw: unknown, fallback: Date): Date {
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const ms = Number.parseInt(raw, 10) * 1000;
    if (Number.isFinite(ms) && ms > 0) return new Date(ms);
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return new Date(ms);
  }
  return fallback;
}

/**
 * Truncation policy for oversized inbound text: keep prefix and mark ignored
 * if empty after trim; if over max, truncate to max (explicit, tested).
 */
export function clampInboundText(raw: string): {
  text: string;
  truncated: boolean;
} {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  if (trimmed.length <= WHATSAPP_INBOUND_TEXT_MAX) {
    return { text: trimmed, truncated: false };
  }
  return {
    text: trimmed.slice(0, WHATSAPP_INBOUND_TEXT_MAX),
    truncated: true,
  };
}

export function normalizeWhatsAppWebhookPayload(
  payload: unknown,
  options?: { now?: Date },
): NormalizeResult {
  const now = options?.now ?? new Date();
  const root = asRecord(payload);
  if (!root) return { kind: "ignored", reason: "invalid_json_root" };

  const entries = Array.isArray(root.entry) ? root.entry : null;
  if (!entries || entries.length === 0) {
    return { kind: "ignored", reason: "no_entries" };
  }

  const out: NormalizedWhatsAppTextMessage[] = [];

  for (const entry of entries) {
    const entryObj = asRecord(entry);
    if (!entryObj) continue;
    const changes = Array.isArray(entryObj.changes) ? entryObj.changes : [];
    for (const change of changes) {
      const changeObj = asRecord(change);
      if (!changeObj) continue;
      const value = asRecord(changeObj.value);
      if (!value) continue;

      // Status / delivery receipts — ignore.
      if (Array.isArray(value.statuses) && value.statuses.length > 0) {
        continue;
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        if (out.length >= MAX_MESSAGES_PER_PAYLOAD) break;
        const message = asRecord(msg);
        if (!message) continue;

        const messageType =
          typeof message.type === "string" ? message.type : "";
        if (messageType !== "text") {
          // media / unknown — ignore safely
          continue;
        }

        const id =
          typeof message.id === "string" ? message.id.trim() : "";
        const from =
          typeof message.from === "string" ? message.from.trim() : "";
        if (!id || !from) continue;

        const textObj = asRecord(message.text);
        const body =
          typeof textObj?.body === "string" ? textObj.body : "";
        const { text } = clampInboundText(body);
        if (!text) continue;

        out.push({
          providerMessageId: id,
          externalSenderId: from,
          messageType: "text",
          text,
          receivedAt: parseTimestamp(message.timestamp, now),
        });
      }
    }
  }

  if (out.length === 0) {
    return { kind: "ignored", reason: "no_text_messages" };
  }

  return { kind: "messages", messages: out };
}
