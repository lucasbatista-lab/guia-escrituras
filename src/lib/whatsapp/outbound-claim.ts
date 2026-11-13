import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  WHATSAPP_OUTBOUND_BATCH_DEFAULT,
  WHATSAPP_OUTBOUND_BATCH_MAX,
  WHATSAPP_OUTBOUND_LEASE_SECONDS,
  WHATSAPP_OUTBOUND_MAX_ATTEMPTS,
  WHATSAPP_OUTBOUND_BACKOFF_MAX_SECONDS,
} from "@/lib/whatsapp/config";
import { computeOutboundBackoffSeconds } from "@/lib/whatsapp/graph-results";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";
import type { OutboundStatus } from "@/lib/whatsapp/outbox";

export type ClaimedOutboundItem = {
  id: string;
  identityId: string;
  externalId: string;
  bodyText: string;
  messageType: string;
  idempotencyKey: string;
  attemptCount: number;
  claimToken: string;
  lockedUntil: string;
};

export type ClaimOutboundResult = {
  claimed: boolean;
  claimToken: string | null;
  items: ClaimedOutboundItem[];
};

export async function claimWhatsAppOutboundMessages(input?: {
  leaseSeconds?: number;
  limit?: number;
}): Promise<ClaimOutboundResult> {
  const leaseSeconds = input?.leaseSeconds ?? WHATSAPP_OUTBOUND_LEASE_SECONDS;
  const limit = Math.min(
    WHATSAPP_OUTBOUND_BATCH_MAX,
    Math.max(1, input?.limit ?? WHATSAPP_OUTBOUND_BATCH_DEFAULT),
  );

  try {
    const admin = createAdminClient();
    await admin.rpc("whatsapp_release_expired_outbound_leases");

    const { data, error } = await admin.rpc("whatsapp_claim_outbound_messages", {
      p_lease_seconds: leaseSeconds,
      p_limit: limit,
    });

    if (error || !data) {
      return { claimed: false, claimToken: null, items: [] };
    }

    const row = data as {
      claimed?: boolean;
      claim_token?: string;
      items?: Array<Record<string, unknown>>;
    };

    const items: ClaimedOutboundItem[] = (row.items ?? []).map((item) => ({
      id: String(item.id),
      identityId: String(item.identity_id),
      externalId: String(item.external_id),
      bodyText: String(item.body_text ?? ""),
      messageType: String(item.message_type ?? "text"),
      idempotencyKey: String(item.idempotency_key ?? ""),
      attemptCount: Number(item.attempt_count ?? 1),
      claimToken: String(item.claim_token ?? row.claim_token ?? ""),
      lockedUntil: String(item.locked_until ?? ""),
    }));

    if (items.length > 0) {
      logWhatsAppOps("outbound_claimed", {
        eventIdPrefix: items[0]!.id.slice(0, 8),
        eventCount: items.length,
      });
    }

    return {
      claimed: Boolean(row.claimed) && items.length > 0,
      claimToken: row.claim_token ?? null,
      items,
    };
  } catch {
    return { claimed: false, claimToken: null, items: [] };
  }
}

export async function completeWhatsAppOutboundSend(input: {
  outboxId: string;
  claimToken: string;
  providerMessageId: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_complete_outbound_send", {
      p_outbox_id: input.outboxId,
      p_claim_token: input.claimToken,
      p_provider_message_id: input.providerMessageId,
    });
    if (error) return false;
    return Boolean((data as { ok?: boolean } | null)?.ok);
  } catch {
    return false;
  }
}

export async function scheduleWhatsAppOutboundRetry(input: {
  outboxId: string;
  claimToken: string;
  attemptCount: number;
  errorCode: string;
  retryAfterSeconds?: number | null;
  maxAttempts?: number;
}): Promise<"retry" | "failed" | "unavailable"> {
  const backoff = computeOutboundBackoffSeconds(
    input.attemptCount,
    input.retryAfterSeconds ?? null,
    WHATSAPP_OUTBOUND_BACKOFF_MAX_SECONDS,
  );
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_schedule_outbound_retry", {
      p_outbox_id: input.outboxId,
      p_claim_token: input.claimToken,
      p_backoff_seconds: backoff,
      p_error_code: input.errorCode,
      p_max_attempts: input.maxAttempts ?? WHATSAPP_OUTBOUND_MAX_ATTEMPTS,
    });
    if (error || !data) return "unavailable";
    const status = (data as { status?: string }).status;
    return status === "failed" ? "failed" : "retry";
  } catch {
    return "unavailable";
  }
}

export async function markWhatsAppOutboundDeliveryUnknown(input: {
  outboxId: string;
  claimToken: string;
  errorCode?: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc(
      "whatsapp_mark_outbound_delivery_unknown",
      {
        p_outbox_id: input.outboxId,
        p_claim_token: input.claimToken,
        p_error_code: input.errorCode ?? "meta_timeout_ambiguous",
      },
    );
    if (error) return false;
    return Boolean((data as { ok?: boolean } | null)?.ok);
  } catch {
    return false;
  }
}

export async function markWhatsAppOutboundFailed(input: {
  outboxId: string;
  claimToken: string;
  errorCode?: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_mark_outbound_failed", {
      p_outbox_id: input.outboxId,
      p_claim_token: input.claimToken,
      p_error_code: input.errorCode ?? "meta_invalid_request",
    });
    if (error) return false;
    return Boolean((data as { ok?: boolean } | null)?.ok);
  } catch {
    return false;
  }
}

export async function cancelWhatsAppOutboundSend(input: {
  outboxId: string;
  claimToken: string;
  errorCode?: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_cancel_outbound_send", {
      p_outbox_id: input.outboxId,
      p_claim_token: input.claimToken,
      p_error_code: input.errorCode ?? "identity_revoked",
    });
    if (error) return false;
    return Boolean((data as { ok?: boolean } | null)?.ok);
  } catch {
    return false;
  }
}

export async function applyWhatsAppDeliveryStatus(input: {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  eventAt?: Date;
  providerErrorCode?: string | null;
}): Promise<{ applied: boolean; reason?: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_apply_delivery_status", {
      p_provider_message_id: input.providerMessageId,
      p_status: input.status,
      p_event_at: (input.eventAt ?? new Date()).toISOString(),
      p_provider_error_code: input.providerErrorCode ?? null,
    });
    if (error || !data) return { applied: false, reason: "rpc_unavailable" };
    const row = data as { applied?: boolean; reason?: string };
    return {
      applied: Boolean(row.applied),
      reason: row.reason,
    };
  } catch {
    return { applied: false, reason: "unavailable" };
  }
}

/** In-memory outbound claim store for unit tests. */
export type MemoryOutboundRow = {
  id: string;
  identityId: string;
  externalId: string;
  bodyText: string;
  messageType: string;
  idempotencyKey: string;
  status: OutboundStatus | "delivered" | "read" | "delivery_unknown";
  attemptCount: number;
  availableAfter: Date;
  expiresAt: Date;
  lockedUntil: Date | null;
  claimToken: string | null;
  providerMessageId: string | null;
  identityActive: boolean;
  errorCode: string | null;
};

export class MemoryOutboundClaimStore {
  readonly rows = new Map<string, MemoryOutboundRow>();
  private seq = 0;

  insert(input: {
    identityId: string;
    externalId: string;
    bodyText: string;
    idempotencyKey: string;
    availableAfter?: Date;
    expiresAt?: Date;
    identityActive?: boolean;
    status?: MemoryOutboundRow["status"];
  }): MemoryOutboundRow {
    this.seq += 1;
    const id = `out_${this.seq}`;
    const row: MemoryOutboundRow = {
      id,
      identityId: input.identityId,
      externalId: input.externalId,
      bodyText: input.bodyText,
      messageType: "text",
      idempotencyKey: input.idempotencyKey,
      status: input.status ?? "pending",
      attemptCount: 0,
      availableAfter: input.availableAfter ?? new Date(0),
      expiresAt:
        input.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
      lockedUntil: null,
      claimToken: null,
      providerMessageId: null,
      identityActive: input.identityActive ?? true,
      errorCode: null,
    };
    this.rows.set(id, row);
    return row;
  }

  releaseExpired(now: Date): number {
    let n = 0;
    for (const row of this.rows.values()) {
      if (
        row.status === "sending" &&
        row.lockedUntil &&
        row.lockedUntil.getTime() <= now.getTime()
      ) {
        row.status = "retry";
        row.availableAfter = now;
        row.lockedUntil = null;
        row.claimToken = null;
        n += 1;
      }
    }
    return n;
  }

  claim(input: {
    now: Date;
    leaseSeconds?: number;
    limit?: number;
  }): ClaimOutboundResult {
    this.releaseExpired(input.now);
    const leaseSeconds = input.leaseSeconds ?? WHATSAPP_OUTBOUND_LEASE_SECONDS;
    const limit = Math.min(
      WHATSAPP_OUTBOUND_BATCH_MAX,
      Math.max(1, input.limit ?? WHATSAPP_OUTBOUND_BATCH_DEFAULT),
    );
    const nowMs = input.now.getTime();

    for (const row of this.rows.values()) {
      if (
        (row.status === "pending" || row.status === "retry") &&
        row.expiresAt.getTime() <= nowMs
      ) {
        row.status = "cancelled";
        row.errorCode = "expired";
      }
    }

    const eligible = [...this.rows.values()]
      .filter((row) => {
        if (!row.identityActive) return false;
        if (row.status !== "pending" && row.status !== "retry") return false;
        if (row.availableAfter.getTime() > nowMs) return false;
        if (row.expiresAt.getTime() <= nowMs) return false;
        if (row.lockedUntil && row.lockedUntil.getTime() > nowMs) return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.availableAfter.getTime() - b.availableAfter.getTime();
        if (da !== 0) return da;
        return a.id.localeCompare(b.id);
      })
      .slice(0, limit);

    if (eligible.length === 0) {
      return { claimed: false, claimToken: null, items: [] };
    }

    const claimToken = `claim_${this.seq}_${nowMs}`;
    const lockedUntil = new Date(nowMs + leaseSeconds * 1000);
    const items: ClaimedOutboundItem[] = [];
    for (const row of eligible) {
      row.status = "sending";
      row.attemptCount += 1;
      row.lockedUntil = lockedUntil;
      row.claimToken = claimToken;
      items.push({
        id: row.id,
        identityId: row.identityId,
        externalId: row.externalId,
        bodyText: row.bodyText,
        messageType: row.messageType,
        idempotencyKey: row.idempotencyKey,
        attemptCount: row.attemptCount,
        claimToken,
        lockedUntil: lockedUntil.toISOString(),
      });
    }
    return { claimed: true, claimToken, items };
  }

  complete(
    outboxId: string,
    claimToken: string,
    providerMessageId: string,
  ): boolean {
    const row = this.rows.get(outboxId);
    if (!row || row.status !== "sending" || row.claimToken !== claimToken) {
      return false;
    }
    for (const other of this.rows.values()) {
      if (
        other.providerMessageId === providerMessageId &&
        other.id !== outboxId
      ) {
        return false;
      }
    }
    row.status = "sent";
    row.providerMessageId = providerMessageId;
    row.lockedUntil = null;
    row.claimToken = null;
    return true;
  }

  retry(
    outboxId: string,
    claimToken: string,
    attemptCount: number,
    errorCode: string,
    maxAttempts = WHATSAPP_OUTBOUND_MAX_ATTEMPTS,
  ): "retry" | "failed" | "unavailable" {
    const row = this.rows.get(outboxId);
    if (!row || row.status !== "sending" || row.claimToken !== claimToken) {
      return "unavailable";
    }
    row.lockedUntil = null;
    row.claimToken = null;
    row.errorCode = errorCode;
    if (attemptCount >= maxAttempts) {
      row.status = "failed";
      return "failed";
    }
    row.status = "retry";
    row.availableAfter = new Date(
      Date.now() +
        computeOutboundBackoffSeconds(attemptCount, null) * 1000,
    );
    return "retry";
  }

  markUnknown(outboxId: string, claimToken: string, errorCode: string): boolean {
    const row = this.rows.get(outboxId);
    if (!row || row.status !== "sending" || row.claimToken !== claimToken) {
      return false;
    }
    row.status = "delivery_unknown";
    row.errorCode = errorCode;
    row.lockedUntil = null;
    row.claimToken = null;
    return true;
  }

  markFailed(outboxId: string, claimToken: string, errorCode: string): boolean {
    const row = this.rows.get(outboxId);
    if (!row || row.status !== "sending" || row.claimToken !== claimToken) {
      return false;
    }
    row.status = "failed";
    row.errorCode = errorCode;
    row.lockedUntil = null;
    row.claimToken = null;
    return true;
  }

  cancel(outboxId: string, claimToken: string): boolean {
    const row = this.rows.get(outboxId);
    if (!row || row.status !== "sending" || row.claimToken !== claimToken) {
      return false;
    }
    row.status = "cancelled";
    row.errorCode = "identity_revoked";
    row.lockedUntil = null;
    row.claimToken = null;
    return true;
  }

  applyStatus(
    providerMessageId: string,
    status: "sent" | "delivered" | "read" | "failed",
  ): { applied: boolean; reason?: string } {
    const row = [...this.rows.values()].find(
      (r) => r.providerMessageId === providerMessageId,
    );
    if (!row) return { applied: false, reason: "unknown_provider_id" };
    if (row.status === "cancelled") {
      return { applied: false, reason: "cancelled" };
    }
    const rank = (s: string) =>
      s === "sent" ? 1 : s === "delivered" ? 2 : s === "read" ? 3 : 0;
    if (status === "failed") {
      if (row.status === "read") {
        return { applied: false, reason: "no_regress_read" };
      }
      if (row.status === "failed") {
        return { applied: false, reason: "idempotent" };
      }
      row.status = "failed";
      return { applied: true };
    }
    if (rank(row.status) >= rank(status) && rank(row.status) > 0) {
      return { applied: false, reason: "idempotent_or_no_regress" };
    }
    row.status = status;
    return { applied: true };
  }
}
