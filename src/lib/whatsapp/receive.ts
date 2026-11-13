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
import { defaultWhatsAppIdentityResolver } from "@/lib/whatsapp/identity";
import type { ChannelIdentityResolver } from "@/lib/whatsapp/identity";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

/**
 * Persist normalized inbound text after signature verification.
 * Identity unresolved → pending_identity (no chat-service call).
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
  identityResolver?: ChannelIdentityResolver;
  now?: Date;
  enabled?: boolean;
}): Promise<ReceiveWhatsAppResult> {
  const enabled =
    input.enabled ?? isWhatsAppChannelEnabled();
  if (!enabled) {
    logWhatsAppOps("channel_disabled");
    return { accepted: 0, duplicates: 0, pendingIdentity: 0, ignored: true, ignoreReason: "channel_disabled" };
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

  const resolver = input.identityResolver ?? defaultWhatsAppIdentityResolver;
  const debounceMs = resolveWhatsAppDebounceMs();
  let accepted = 0;
  let duplicates = 0;
  let pendingIdentity = 0;

  for (const message of normalized.messages) {
    const userId = await resolver.resolve({
      channel: "whatsapp",
      externalSenderId: message.externalSenderId,
    });

    const availableAfter = new Date(
      message.receivedAt.getTime() + debounceMs,
    );
    const status = userId ? "pending" : "pending_identity";

    const inserted = await insertWhatsAppInboundEvent({
      message,
      availableAfter,
      status,
    });

    if (inserted.kind === "duplicate") {
      duplicates += 1;
      logWhatsAppOps("event_deduplicated", {
        eventIdPrefix: inserted.id.slice(0, 8),
      });
      continue;
    }
    if (inserted.kind === "unavailable") {
      logWhatsAppOps("processing_failed", { reason: inserted.reason });
      continue;
    }

    accepted += 1;
    if (!userId) {
      pendingIdentity += 1;
      logWhatsAppOps("pending_identity", {
        eventIdPrefix: inserted.id.slice(0, 8),
      });
      await markWhatsAppInboundStatus({
        id: inserted.id,
        status: "pending_identity",
        errorCode: "identity_unresolved",
      });
    }
  }

  return { accepted, duplicates, pendingIdentity, ignored: false };
}
