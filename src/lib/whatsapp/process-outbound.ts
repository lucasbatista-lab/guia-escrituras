import "server-only";

import {
  isWhatsAppOutboundSendAllowed,
  resolveWhatsAppOutboundConfig,
  WHATSAPP_OUTBOUND_BATCH_DEFAULT,
  WHATSAPP_OUTBOUND_BATCH_MAX,
  WHATSAPP_OUTBOUND_MAX_ATTEMPTS,
} from "@/lib/whatsapp/config";
import {
  MetaWhatsAppGraphClient,
  type GraphHttpTransport,
} from "@/lib/whatsapp/graph-client";
import type { MetaGraphSendResult } from "@/lib/whatsapp/graph-results";
import {
  cancelWhatsAppOutboundSend,
  claimWhatsAppOutboundMessages,
  completeWhatsAppOutboundSend,
  markWhatsAppOutboundDeliveryUnknown,
  markWhatsAppOutboundFailed,
  MemoryOutboundClaimStore,
  scheduleWhatsAppOutboundRetry,
  type ClaimedOutboundItem,
} from "@/lib/whatsapp/outbound-claim";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

export type OutboundProcessCounts = {
  claimed: number;
  sent: number;
  retry: number;
  failed: number;
  unknown: number;
  cancelled: number;
};

export type ProcessOutboundDeps = {
  enabled?: boolean;
  maxBatch?: number;
  transport?: GraphHttpTransport;
  client?: MetaWhatsAppGraphClient;
  memory?: MemoryOutboundClaimStore;
  now?: Date;
  /** Re-check identity still active after claim (memory tests). */
  isIdentityActive?: (identityId: string) => boolean | Promise<boolean>;
  sendText?: (
    item: ClaimedOutboundItem,
  ) => Promise<MetaGraphSendResult>;
};

async function persistResult(
  item: ClaimedOutboundItem,
  result: MetaGraphSendResult,
  deps: ProcessOutboundDeps,
): Promise<keyof Omit<OutboundProcessCounts, "claimed">> {
  if (deps.memory) {
    if (result.kind === "SUCCESS") {
      deps.memory.complete(
        item.id,
        item.claimToken,
        result.providerMessageId,
      );
      logWhatsAppOps("outbound_sent", {
        eventIdPrefix: item.id.slice(0, 8),
        latencyMs: result.latencyMs,
      });
      return "sent";
    }
    if (result.kind === "AMBIGUOUS_DELIVERY") {
      deps.memory.markUnknown(item.id, item.claimToken, result.errorCode);
      logWhatsAppOps("outbound_delivery_unknown", {
        eventIdPrefix: item.id.slice(0, 8),
      });
      return "unknown";
    }
    if (result.kind === "PERMANENT_FAILURE") {
      deps.memory.markFailed(item.id, item.claimToken, result.errorCode);
      logWhatsAppOps("outbound_failed", {
        eventIdPrefix: item.id.slice(0, 8),
      });
      return "failed";
    }
    const outcome = deps.memory.retry(
      item.id,
      item.claimToken,
      item.attemptCount,
      result.errorCode,
      WHATSAPP_OUTBOUND_MAX_ATTEMPTS,
    );
    if (outcome === "failed") {
      logWhatsAppOps("outbound_failed", {
        eventIdPrefix: item.id.slice(0, 8),
      });
      return "failed";
    }
    logWhatsAppOps("outbound_retry_scheduled", {
      eventIdPrefix: item.id.slice(0, 8),
    });
    return "retry";
  }

  if (result.kind === "SUCCESS") {
    await completeWhatsAppOutboundSend({
      outboxId: item.id,
      claimToken: item.claimToken,
      providerMessageId: result.providerMessageId,
    });
    logWhatsAppOps("outbound_sent", {
      eventIdPrefix: item.id.slice(0, 8),
      latencyMs: result.latencyMs,
    });
    return "sent";
  }
  if (result.kind === "AMBIGUOUS_DELIVERY") {
    await markWhatsAppOutboundDeliveryUnknown({
      outboxId: item.id,
      claimToken: item.claimToken,
      errorCode: result.errorCode,
    });
    logWhatsAppOps("outbound_delivery_unknown", {
      eventIdPrefix: item.id.slice(0, 8),
    });
    return "unknown";
  }
  if (result.kind === "PERMANENT_FAILURE") {
    await markWhatsAppOutboundFailed({
      outboxId: item.id,
      claimToken: item.claimToken,
      errorCode: result.errorCode,
    });
    logWhatsAppOps("outbound_failed", {
      eventIdPrefix: item.id.slice(0, 8),
    });
    return "failed";
  }
  const outcome = await scheduleWhatsAppOutboundRetry({
    outboxId: item.id,
    claimToken: item.claimToken,
    attemptCount: item.attemptCount,
    errorCode: result.errorCode,
    retryAfterSeconds: result.retryAfterSeconds,
  });
  if (outcome === "failed") {
    logWhatsAppOps("outbound_failed", {
      eventIdPrefix: item.id.slice(0, 8),
    });
    return "failed";
  }
  logWhatsAppOps("outbound_retry_scheduled", {
    eventIdPrefix: item.id.slice(0, 8),
  });
  return "retry";
}

/**
 * Process pending WhatsApp outbound messages.
 * Never accepts destination/body from HTTP. No cron in this block.
 */
export async function processPendingWhatsAppOutbound(
  deps: ProcessOutboundDeps = {},
): Promise<OutboundProcessCounts> {
  const counts: OutboundProcessCounts = {
    claimed: 0,
    sent: 0,
    retry: 0,
    failed: 0,
    unknown: 0,
    cancelled: 0,
  };

  const enabled = deps.enabled ?? isWhatsAppOutboundSendAllowed();
  if (!enabled) {
    logWhatsAppOps("worker_disabled", { reason: "outbound_disabled" });
    return counts;
  }

  const maxBatch = Math.min(
    WHATSAPP_OUTBOUND_BATCH_MAX,
    Math.max(1, deps.maxBatch ?? WHATSAPP_OUTBOUND_BATCH_DEFAULT),
  );

  logWhatsAppOps("outbound_batch_started", { eventCount: maxBatch });

  let items: ClaimedOutboundItem[] = [];
  if (deps.memory) {
    const claimed = deps.memory.claim({
      now: deps.now ?? new Date(),
      limit: maxBatch,
    });
    items = claimed.items;
  } else {
    const claimed = await claimWhatsAppOutboundMessages({ limit: maxBatch });
    items = claimed.items;
  }

  counts.claimed = items.length;
  if (items.length === 0) return counts;

  let client: MetaWhatsAppGraphClient | null = deps.client ?? null;
  if (!deps.sendText && !client) {
    const cfg = resolveWhatsAppOutboundConfig();
    if (!cfg.ok) {
      logWhatsAppOps("meta_configuration_error");
      // Fail claimed items permanently for config — avoid hammering.
      for (const item of items) {
        if (deps.memory) {
          deps.memory.markFailed(
            item.id,
            item.claimToken,
            "meta_configuration_error",
          );
        } else {
          await markWhatsAppOutboundFailed({
            outboxId: item.id,
            claimToken: item.claimToken,
            errorCode: "meta_configuration_error",
          });
        }
        counts.failed += 1;
      }
      return counts;
    }
    client = new MetaWhatsAppGraphClient({
      accessToken: cfg.accessToken,
      phoneNumberId: cfg.phoneNumberId,
      graphApiVersion: cfg.graphApiVersion,
      transport: deps.transport,
    });
  }

  for (const item of items) {
    const active =
      deps.isIdentityActive != null
        ? await deps.isIdentityActive(item.identityId)
        : deps.memory
          ? (deps.memory.rows.get(item.id)?.identityActive ?? true)
          : true;

    if (!active) {
      if (deps.memory) {
        deps.memory.cancel(item.id, item.claimToken);
      } else {
        await cancelWhatsAppOutboundSend({
          outboxId: item.id,
          claimToken: item.claimToken,
          errorCode: "identity_revoked",
        });
      }
      logWhatsAppOps("outbound_cancelled", {
        eventIdPrefix: item.id.slice(0, 8),
      });
      counts.cancelled += 1;
      continue;
    }

    let result: MetaGraphSendResult;
    try {
      if (deps.sendText) {
        result = await deps.sendText(item);
      } else {
        result = await client!.sendText({
          to: item.externalId,
          body: item.bodyText,
          idempotencyKey: item.idempotencyKey,
        });
      }
    } catch {
      result = {
        kind: "AMBIGUOUS_DELIVERY",
        errorCode: "meta_network_error",
        latencyMs: 0,
      };
    }

    const key = await persistResult(item, result, deps);
    counts[key] += 1;

    if (
      (result.kind === "PERMANENT_FAILURE" ||
        result.kind === "TRANSIENT_FAILURE") &&
      result.abortBatch
    ) {
      // Abort remaining claimed items as retry (auth/config hammer stop).
      const remaining = items.slice(items.indexOf(item) + 1);
      for (const rest of remaining) {
        if (result.kind === "PERMANENT_FAILURE" && result.abortBatch) {
          if (deps.memory) {
            deps.memory.markFailed(
              rest.id,
              rest.claimToken,
              result.errorCode,
            );
          } else {
            await markWhatsAppOutboundFailed({
              outboxId: rest.id,
              claimToken: rest.claimToken,
              errorCode: result.errorCode,
            });
          }
          counts.failed += 1;
        } else {
          if (deps.memory) {
            deps.memory.retry(
              rest.id,
              rest.claimToken,
              rest.attemptCount,
              result.errorCode,
            );
          } else {
            await scheduleWhatsAppOutboundRetry({
              outboxId: rest.id,
              claimToken: rest.claimToken,
              attemptCount: rest.attemptCount,
              errorCode: result.errorCode,
              retryAfterSeconds:
                result.kind === "TRANSIENT_FAILURE"
                  ? result.retryAfterSeconds
                  : null,
            });
          }
          counts.retry += 1;
        }
      }
      break;
    }
  }

  return counts;
}
