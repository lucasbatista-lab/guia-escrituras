import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { WHATSAPP_OUTBOUND_TEXT_MAX } from "@/lib/whatsapp/config";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

export type OutboundMessageType = "text" | "link_confirmation";

export type OutboundStatus =
  | "pending"
  | "sending"
  | "sent"
  | "retry"
  | "failed"
  | "cancelled";

export type InsertOutboxResult =
  | { kind: "inserted"; id: string }
  | { kind: "duplicate"; id: string }
  | { kind: "unavailable"; reason: string };

const OUTBOX_TTL_HOURS = 72;

export function outboundIdempotencyKey(bundleId: string): string {
  return `bundle:${bundleId}`;
}

export async function insertWhatsAppOutboundMessage(input: {
  identityId: string;
  idempotencyKey: string;
  messageType: OutboundMessageType;
  bodyText: string;
}): Promise<InsertOutboxResult> {
  const body = input.bodyText.slice(0, WHATSAPP_OUTBOUND_TEXT_MAX);
  if (!body.trim()) return { kind: "unavailable", reason: "empty_body" };

  try {
    const admin = createAdminClient();
    const expiresAt = new Date(
      Date.now() + OUTBOX_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await admin
      .from("whatsapp_outbound_messages")
      .insert({
        identity_id: input.identityId,
        idempotency_key: input.idempotencyKey,
        message_type: input.messageType,
        body_text: body,
        status: "pending",
        attempt_count: 0,
        expires_at: expiresAt,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        const existing = await admin
          .from("whatsapp_outbound_messages")
          .select("id")
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (existing.data?.id) {
          return { kind: "duplicate", id: existing.data.id as string };
        }
        return { kind: "duplicate", id: "unknown" };
      }
      return { kind: "unavailable", reason: "insert_error" };
    }

    if (!data?.id) return { kind: "unavailable", reason: "empty_insert" };
    logWhatsAppOps("outbox_created", {
      eventIdPrefix: (data.id as string).slice(0, 8),
    });
    return { kind: "inserted", id: data.id as string };
  } catch {
    return { kind: "unavailable", reason: "admin_client_unavailable" };
  }
}

/** In-memory outbox for tests. */
export class MemoryWhatsAppOutbox {
  readonly rows = new Map<
    string,
    {
      id: string;
      identityId: string;
      idempotencyKey: string;
      bodyText: string;
      status: OutboundStatus;
      messageType: OutboundMessageType;
    }
  >();

  insert(input: {
    identityId: string;
    idempotencyKey: string;
    messageType: OutboundMessageType;
    bodyText: string;
  }): InsertOutboxResult {
    for (const row of this.rows.values()) {
      if (row.idempotencyKey === input.idempotencyKey) {
        return { kind: "duplicate", id: row.id };
      }
    }
    const id = `out_${this.rows.size + 1}`;
    this.rows.set(id, {
      id,
      identityId: input.identityId,
      idempotencyKey: input.idempotencyKey,
      bodyText: input.bodyText.slice(0, WHATSAPP_OUTBOUND_TEXT_MAX),
      status: "pending",
      messageType: input.messageType,
    });
    return { kind: "inserted", id };
  }

  cancelForIdentity(identityId: string): number {
    let n = 0;
    for (const row of this.rows.values()) {
      if (
        row.identityId === identityId &&
        (row.status === "pending" ||
          row.status === "retry" ||
          row.status === "sending")
      ) {
        row.status = "cancelled";
        n += 1;
      }
    }
    return n;
  }
}

export const LINK_CONFIRMATION_COPY =
  "Seu WhatsApp foi vinculado à sua conta Amém Chat. Você já pode conversar por aqui quando sua assinatura permitir.";
