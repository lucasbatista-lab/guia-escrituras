import "server-only";

import {
  isWhatsAppChannelEnabled,
  resolveWhatsAppDebounceMs,
} from "@/lib/whatsapp/config";
import {
  insertWhatsAppInboundEvent,
  markWhatsAppInboundStatus,
} from "@/lib/whatsapp/inbound-events";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp/normalize";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

/**
 * Persist normalized inbound text after signature verification.
 * Identity resolution and VINCULAR handling happen in the durable worker.
 * Events are stored as pending so unlinked senders can still link via code.
 */

export type ReceiveWhatsAppResult = {
  accepted: number;
  duplicates: number;
  pendingIdentity: number;
  ignored: boolean;
  ignoreReason?: string;
};

export async function receiveWhatsAppWebhookPayload(input: {
  payload: unknown;
  now?: Date;
  enabled?: boolean;
}): Promise<ReceiveWhatsAppResult> {
  const enabled = input.enabled ?? isWhatsAppChannelEnabled();
  if (!enabled) {
    logWhatsAppOps("channel_disabled");
    return {
      accepted: 0,
      duplicates: 0,
      pendingIdentity: 0,
      ignored: true,
      ignoreReason: "channel_disabled",
    };
  }

  const normalized = normalizeWhatsAppWebhookPayload(input.payload, {
    now: input.now,
  });
  if (normalized.kind === "ignored") {
    logWhatsAppOps("event_ignored", { reason: normalized.reason });
    return {
      accepted: 0,
      duplicates: 0,
      pendingIdentity: 0,
      ignored: true,
      ignoreReason: normalized.reason,
    };
  }

  logWhatsAppOps("webhook_received", {
    messageCount: normalized.messages.length,
  });

  const debounceMs = resolveWhatsAppDebounceMs();
  let accepted = 0;
  let duplicates = 0;

  for (const message of normalized.messages) {
    const availableAfter = new Date(
      message.receivedAt.getTime() + debounceMs,
    );

    const inserted = await insertWhatsAppInboundEvent({
      message,
      availableAfter,
      status: "pending",
    });

    if (inserted.kind === "duplicate") {
      duplicates += 1;
      logWhatsAppOps("event_deduplicated");
      continue;
    }
    if (inserted.kind === "unavailable") {
      await markWhatsAppInboundStatus({
        id: "unknown",
        status: "failed",
        errorCode: "persist_unavailable",
      }).catch(() => undefined);
      continue;
    }
    accepted += 1;
  }

  return {
    accepted,
    duplicates,
    pendingIdentity: 0,
    ignored: false,
  };
}
