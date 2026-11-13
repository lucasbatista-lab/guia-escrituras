import "server-only";

import {
  isWhatsAppChannelEnabled,
  resolveWhatsAppDebounceMs,
} from "@/lib/whatsapp/config";
import {
  applyNormalizedDeliveryStatuses,
  normalizeWhatsAppDeliveryStatuses,
} from "@/lib/whatsapp/delivery-status";
import {
  insertWhatsAppInboundEvent,
  markWhatsAppInboundStatus,
} from "@/lib/whatsapp/inbound-events";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp/normalize";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

/**
 * Persist normalized inbound text after signature verification.
 * Also applies delivery status updates (monotonic) without debounce/IA.
 */

export type ReceiveWhatsAppResult = {
  accepted: number;
  duplicates: number;
  pendingIdentity: number;
  statusesApplied: number;
  statusesIgnored: number;
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
      statusesApplied: 0,
      statusesIgnored: 0,
      ignored: true,
      ignoreReason: "channel_disabled",
    };
  }

  // Statuses may be applied even when outbound send flag is off
  // (channel flag already required above).
  const statusNorm = normalizeWhatsAppDeliveryStatuses(input.payload, {
    now: input.now,
  });
  let statusesApplied = 0;
  let statusesIgnored = 0;
  if (statusNorm.kind === "statuses") {
    const applied = await applyNormalizedDeliveryStatuses(statusNorm.statuses);
    statusesApplied = applied.applied;
    statusesIgnored = applied.ignored;
  }

  const normalized = normalizeWhatsAppWebhookPayload(input.payload, {
    now: input.now,
  });
  if (normalized.kind === "ignored") {
    if (statusesApplied > 0 || statusesIgnored > 0) {
      return {
        accepted: 0,
        duplicates: 0,
        pendingIdentity: 0,
        statusesApplied,
        statusesIgnored,
        ignored: false,
      };
    }
    logWhatsAppOps("event_ignored", { reason: normalized.reason });
    return {
      accepted: 0,
      duplicates: 0,
      pendingIdentity: 0,
      statusesApplied,
      statusesIgnored,
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
    statusesApplied,
    statusesIgnored,
    ignored: false,
  };
}
