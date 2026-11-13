import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";
import type { MessageBundle } from "@/lib/whatsapp/debounce";
import { buildBundlesForSender } from "@/lib/whatsapp/debounce";
import { resolveWhatsAppDebounceMs } from "@/lib/whatsapp/config";

/** Default lease for claimed inbound bundles (seconds). */
export const WHATSAPP_CLAIM_LEASE_SECONDS = 90;

/** Conservative default batch size per worker invocation. */
export const WHATSAPP_CLAIM_LIMIT_DEFAULT = 10;

export const WHATSAPP_MAX_BUNDLE_ATTEMPTS = 8;

export type ClaimedInboundBundle = {
  bundleId: string;
  eventIds: string[];
  lockedUntil: string;
  bundle: MessageBundle;
  attemptCount: number;
};

export type ClaimResult =
  | { claimed: false }
  | { claimed: true; value: ClaimedInboundBundle };

export function computeBackoffSeconds(attemptCount: number): number {
  const capped = Math.min(Math.max(attemptCount, 1), 8);
  // Deterministic: 5, 10, 20, 40, 80, 160, 300, 300
  return Math.min(300, 5 * 2 ** (capped - 1));
}

export async function claimNextWhatsAppInboundBundle(input?: {
  leaseSeconds?: number;
  limit?: number;
  debounceMs?: number;
}): Promise<ClaimResult> {
  const leaseSeconds = input?.leaseSeconds ?? WHATSAPP_CLAIM_LEASE_SECONDS;
  const limit = input?.limit ?? WHATSAPP_CLAIM_LIMIT_DEFAULT;
  const debounceMs = input?.debounceMs ?? resolveWhatsAppDebounceMs();

  try {
    const admin = createAdminClient();
    await admin.rpc("whatsapp_release_expired_inbound_leases");

    const { data, error } = await admin.rpc("whatsapp_claim_inbound_bundle", {
      p_lease_seconds: leaseSeconds,
      p_limit: limit,
    });

    if (error || !data) return { claimed: false };
    const row = data as {
      claimed?: boolean;
      bundle_id?: string;
      event_ids?: string[];
      locked_until?: string;
    };
    if (!row.claimed || !row.bundle_id || !row.event_ids?.length) {
      return { claimed: false };
    }

    const { data: events, error: evErr } = await admin
      .from("whatsapp_inbound_events")
      .select(
        "id, provider_message_id, external_sender_id, message_text, received_at, attempt_count",
      )
      .in("id", row.event_ids)
      .order("received_at", { ascending: true });

    if (evErr || !events?.length) return { claimed: false };

    const externalSenderId = events[0]!.external_sender_id as string;
    const items = events.map((e) => ({
      providerMessageId: e.provider_message_id as string,
      externalSenderId: e.external_sender_id as string,
      text: (e.message_text as string) ?? "",
      receivedAt: new Date(e.received_at as string),
    }));

    const bundles = buildBundlesForSender({
      externalSenderId,
      items,
      debounceMs,
    });
    const bundle = bundles[0];
    if (!bundle) return { claimed: false };

    const attemptCount = Math.max(
      ...events.map((e) => Number(e.attempt_count ?? 1)),
    );

    logWhatsAppOps("bundle_claimed", {
      eventIdPrefix: row.bundle_id.slice(0, 8),
      eventCount: events.length,
    });

    return {
      claimed: true,
      value: {
        bundleId: row.bundle_id,
        eventIds: row.event_ids,
        lockedUntil: row.locked_until ?? new Date().toISOString(),
        bundle,
        attemptCount,
      },
    };
  } catch {
    return { claimed: false };
  }
}

export async function completeWhatsAppInboundBundle(input: {
  bundleId: string;
  status: "processed" | "pending_identity" | "ignored" | "failed";
  errorCode?: string | null;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_complete_inbound_bundle", {
      p_bundle_id: input.bundleId,
      p_status: input.status,
      p_error_code: input.errorCode ?? null,
    });
    if (error) return false;
    const ok = Boolean((data as { ok?: boolean } | null)?.ok);
    if (ok) {
      if (input.status === "processed") {
        logWhatsAppOps("bundle_completed", {
          eventIdPrefix: input.bundleId.slice(0, 8),
        });
      } else if (input.status === "failed") {
        logWhatsAppOps("bundle_failed", {
          eventIdPrefix: input.bundleId.slice(0, 8),
        });
      } else if (input.status === "pending_identity") {
        logWhatsAppOps("pending_identity", {
          eventIdPrefix: input.bundleId.slice(0, 8),
        });
      }
    }
    return ok;
  } catch {
    return false;
  }
}

export async function retryWhatsAppInboundBundle(input: {
  bundleId: string;
  attemptCount: number;
  errorCode?: string | null;
  maxAttempts?: number;
}): Promise<"retry" | "failed" | "unavailable"> {
  const backoff = computeBackoffSeconds(input.attemptCount);
  const maxAttempts = input.maxAttempts ?? WHATSAPP_MAX_BUNDLE_ATTEMPTS;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_retry_inbound_bundle", {
      p_bundle_id: input.bundleId,
      p_backoff_seconds: backoff,
      p_error_code: input.errorCode ?? null,
      p_max_attempts: maxAttempts,
    });
    if (error || !data) return "unavailable";
    const row = data as { failed?: number; retried?: number };
    if ((row.failed ?? 0) > 0) {
      logWhatsAppOps("bundle_failed", {
        eventIdPrefix: input.bundleId.slice(0, 8),
      });
      return "failed";
    }
    logWhatsAppOps("bundle_retried", {
      eventIdPrefix: input.bundleId.slice(0, 8),
      backoffSeconds: backoff,
    });
    return "retry";
  } catch {
    return "unavailable";
  }
}

/** Pure in-memory claim store for unit tests. */
export type MemoryInboundEvent = {
  id: string;
  providerMessageId: string;
  externalSenderId: string;
  text: string;
  receivedAt: Date;
  availableAfter: Date;
  status:
    | "pending"
    | "bundled"
    | "processing"
    | "processed"
    | "ignored"
    | "failed"
    | "pending_identity"
    | "retry";
  attemptCount: number;
  bundleId: string | null;
  lockedUntil: Date | null;
  nextAttemptAt: Date | null;
};

export class MemoryWhatsAppClaimStore {
  readonly events = new Map<string, MemoryInboundEvent>();
  private seq = 0;

  insert(input: {
    externalSenderId: string;
    text: string;
    receivedAt: Date;
    availableAfter: Date;
    providerMessageId?: string;
    status?: MemoryInboundEvent["status"];
  }): MemoryInboundEvent {
    this.seq += 1;
    const id = `evt_${this.seq}`;
    const row: MemoryInboundEvent = {
      id,
      providerMessageId: input.providerMessageId ?? `wamid.${this.seq}`,
      externalSenderId: input.externalSenderId,
      text: input.text,
      receivedAt: input.receivedAt,
      availableAfter: input.availableAfter,
      status: input.status ?? "pending",
      attemptCount: 0,
      bundleId: null,
      lockedUntil: null,
      nextAttemptAt: null,
    };
    this.events.set(id, row);
    return row;
  }

  releaseExpired(now: Date): number {
    let n = 0;
    for (const e of this.events.values()) {
      if (
        e.status === "processing" &&
        e.lockedUntil &&
        e.lockedUntil.getTime() <= now.getTime()
      ) {
        e.status = "retry";
        e.nextAttemptAt = now;
        e.lockedUntil = null;
        n += 1;
      }
    }
    return n;
  }

  claim(input: {
    now: Date;
    leaseSeconds?: number;
    limit?: number;
    debounceMs?: number;
  }): ClaimResult {
    this.releaseExpired(input.now);
    const leaseSeconds = input.leaseSeconds ?? WHATSAPP_CLAIM_LEASE_SECONDS;
    const limit = input.limit ?? WHATSAPP_CLAIM_LIMIT_DEFAULT;
    const debounceMs = input.debounceMs ?? 3000;
    const nowMs = input.now.getTime();

    const eligible = [...this.events.values()]
      .filter((e) => {
        if (!["pending", "bundled", "retry"].includes(e.status)) return false;
        if (e.availableAfter.getTime() > nowMs) return false;
        if (e.nextAttemptAt && e.nextAttemptAt.getTime() > nowMs) return false;
        if (e.lockedUntil && e.lockedUntil.getTime() > nowMs) return false;
        return true;
      })
      .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

    const first = eligible[0];
    if (!first) return { claimed: false };

    const sameSender = eligible
      .filter((e) => e.externalSenderId === first.externalSenderId)
      .slice(0, limit);

    const bundleId = `bundle_${this.seq + 1}_${Date.now()}`;
    const lockedUntil = new Date(nowMs + leaseSeconds * 1000);
    for (const e of sameSender) {
      e.status = "processing";
      e.bundleId = bundleId;
      e.lockedUntil = lockedUntil;
      e.attemptCount += 1;
    }

    const bundles = buildBundlesForSender({
      externalSenderId: first.externalSenderId,
      items: sameSender.map((e) => ({
        providerMessageId: e.providerMessageId,
        externalSenderId: e.externalSenderId,
        text: e.text,
        receivedAt: e.receivedAt,
      })),
      debounceMs,
    });
    const bundle = bundles[0];
    if (!bundle) return { claimed: false };

    return {
      claimed: true,
      value: {
        bundleId,
        eventIds: sameSender.map((e) => e.id),
        lockedUntil: lockedUntil.toISOString(),
        bundle,
        attemptCount: Math.max(...sameSender.map((e) => e.attemptCount)),
      },
    };
  }

  complete(
    bundleId: string,
    status: MemoryInboundEvent["status"],
  ): number {
    let n = 0;
    for (const e of this.events.values()) {
      if (e.bundleId === bundleId && e.status === "processing") {
        e.status = status;
        e.lockedUntil = null;
        n += 1;
      }
    }
    return n;
  }

  retry(
    bundleId: string,
    attemptCount: number,
    maxAttempts = WHATSAPP_MAX_BUNDLE_ATTEMPTS,
  ): "retry" | "failed" {
    const backoff = computeBackoffSeconds(attemptCount);
    const next = new Date(Date.now() + backoff * 1000);
    let outcome: "retry" | "failed" = "retry";
    for (const e of this.events.values()) {
      if (e.bundleId === bundleId && e.status === "processing") {
        const effectiveAttempts = Math.max(e.attemptCount, attemptCount);
        if (effectiveAttempts >= maxAttempts) {
          e.status = "failed";
          e.lockedUntil = null;
          outcome = "failed";
        } else {
          e.status = "retry";
          e.nextAttemptAt = next;
          e.lockedUntil = null;
        }
      }
    }
    return outcome;
  }
}
