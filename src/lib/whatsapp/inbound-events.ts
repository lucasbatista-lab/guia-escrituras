import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { WHATSAPP_INBOUND_TEXT_MAX } from "@/lib/whatsapp/config";
import type { NormalizedWhatsAppTextMessage } from "@/lib/whatsapp/normalize";

/**
 * Dedicated WhatsApp inbound persistence — do not route through
 * src/lib/database/repositories/index.ts.
 */

export type WhatsAppInboundStatus =
  | "pending"
  | "bundled"
  | "processing"
  | "processed"
  | "ignored"
  | "failed"
  | "pending_identity"
  | "retry";

export type WhatsAppInboundRow = {
  id: string;
  provider_message_id: string;
  external_sender_id: string;
  message_type: string;
  message_text: string;
  received_at: string;
  available_after: string;
  status: WhatsAppInboundStatus;
  attempt_count: number;
  processed_at: string | null;
  expires_at: string;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type InsertInboundResult =
  | { kind: "inserted"; id: string }
  | { kind: "duplicate"; id: string }
  | { kind: "unavailable"; reason: string };

const DEFAULT_TTL_HOURS = 72;

export function computeExpiresAt(
  receivedAt: Date,
  ttlHours = DEFAULT_TTL_HOURS,
): Date {
  return new Date(receivedAt.getTime() + ttlHours * 60 * 60 * 1000);
}

function clampText(text: string): string {
  return text.slice(0, WHATSAPP_INBOUND_TEXT_MAX);
}

/**
 * Insert inbound text event. Unique provider_message_id → duplicate on conflict.
 * Never stores raw webhook payload or headers.
 */
export async function insertWhatsAppInboundEvent(input: {
  message: NormalizedWhatsAppTextMessage;
  availableAfter: Date;
  status?: WhatsAppInboundStatus;
}): Promise<InsertInboundResult> {
  try {
    const admin = createAdminClient();
    const receivedAt = input.message.receivedAt;
    const row = {
      provider_message_id: input.message.providerMessageId,
      external_sender_id: input.message.externalSenderId,
      message_type: input.message.messageType,
      message_text: clampText(input.message.text),
      received_at: receivedAt.toISOString(),
      available_after: input.availableAfter.toISOString(),
      status: input.status ?? "pending",
      attempt_count: 0,
      expires_at: computeExpiresAt(receivedAt).toISOString(),
      error_code: null,
    };

    const { data, error } = await admin
      .from("whatsapp_inbound_events")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (error) {
      // Unique violation — idempotent retry from Meta.
      if (error.code === "23505") {
        const existing = await admin
          .from("whatsapp_inbound_events")
          .select("id")
          .eq("provider_message_id", input.message.providerMessageId)
          .maybeSingle();
        if (existing.data?.id) {
          return { kind: "duplicate", id: existing.data.id as string };
        }
        return { kind: "duplicate", id: "unknown" };
      }
      return { kind: "unavailable", reason: "insert_error" };
    }

    if (!data?.id) return { kind: "unavailable", reason: "empty_insert" };
    return { kind: "inserted", id: data.id as string };
  } catch {
    return { kind: "unavailable", reason: "admin_client_unavailable" };
  }
}

export async function markWhatsAppInboundStatus(input: {
  id: string;
  status: WhatsAppInboundStatus;
  errorCode?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
      error_code: input.errorCode ?? null,
    };
    if (
      input.status === "processed" ||
      input.status === "ignored" ||
      input.status === "failed"
    ) {
      patch.processed_at = new Date().toISOString();
    }
    await admin
      .from("whatsapp_inbound_events")
      .update(patch)
      .eq("id", input.id);
  } catch {
    // Fail-open for status updates — ops can reconcile later.
  }
}

/**
 * In-memory store for unit tests (no Supabase).
 */
export class MemoryWhatsAppInboundStore {
  readonly rows = new Map<
    string,
    {
      id: string;
      providerMessageId: string;
      status: WhatsAppInboundStatus;
      message: NormalizedWhatsAppTextMessage;
    }
  >();

  insert(
    message: NormalizedWhatsAppTextMessage,
    status: WhatsAppInboundStatus = "pending",
  ): InsertInboundResult {
    for (const row of this.rows.values()) {
      if (row.providerMessageId === message.providerMessageId) {
        return { kind: "duplicate", id: row.id };
      }
    }
    const id = `mem_${this.rows.size + 1}`;
    this.rows.set(id, {
      id,
      providerMessageId: message.providerMessageId,
      status,
      message,
    });
    return { kind: "inserted", id };
  }
}
