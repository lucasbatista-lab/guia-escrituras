import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Conservative lease while a worker processes a `received` event. */
export const PAYMENT_EVENT_LEASE_MS = 3 * 60 * 1000;

/** Cap reclaim attempts to avoid infinite Stripe ↔ app retry loops. */
export const PAYMENT_EVENT_MAX_ATTEMPTS = 25;

export type ClaimPaymentEventResult =
  | "claimed"
  | "duplicate"
  | "in_flight"
  | "exhausted";

export type PaymentEventRow = {
  id: string;
  processing_status: "received" | "processed" | "failed" | "ignored" | string;
  attempt_count: number;
  updated_at: string;
};

export type PaymentEventClaimStore = {
  getByProviderEventId(
    providerEventId: string,
  ): Promise<PaymentEventRow | null>;
  insertReceived(input: {
    providerEventId: string;
    eventType: string;
    objectId: string | null;
  }): Promise<"ok" | "conflict">;
  /**
   * Atomically move failed → received and bump attempt_count.
   * Returns true only when this worker won the claim.
   */
  claimFailed(input: {
    id: string;
    nextAttemptCount: number;
  }): Promise<boolean>;
  /**
   * Atomically reclaim stale received (updated_at < cutoff) and bump attempts.
   */
  claimStaleReceived(input: {
    id: string;
    cutoffIso: string;
    nextAttemptCount: number;
  }): Promise<boolean>;
  markExhausted(providerEventId: string): Promise<void>;
};

export function createSupabasePaymentEventClaimStore(): PaymentEventClaimStore {
  return {
    async getByProviderEventId(providerEventId) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("payment_events")
        .select("id, processing_status, attempt_count, updated_at")
        .eq("provider_event_id", providerEventId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id as string,
        processing_status: data.processing_status as string,
        attempt_count: Number(data.attempt_count ?? 0),
        updated_at: data.updated_at as string,
      };
    },

    async insertReceived(input) {
      const admin = createAdminClient();
      const { error } = await admin.from("payment_events").insert({
        provider_event_id: input.providerEventId,
        event_type: input.eventType,
        object_id: input.objectId,
        processing_status: "received",
        attempt_count: 0,
      });
      if (!error) return "ok";
      // Unique violation on provider_event_id — another worker inserted first.
      return "conflict";
    },

    async claimFailed(input) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("payment_events")
        .update({
          processing_status: "received",
          attempt_count: input.nextAttemptCount,
          last_error_code: null,
        })
        .eq("id", input.id)
        .eq("processing_status", "failed")
        .select("id");
      if (error) return false;
      return Boolean(data && data.length > 0);
    },

    async claimStaleReceived(input) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("payment_events")
        .update({
          attempt_count: input.nextAttemptCount,
          last_error_code: null,
        })
        .eq("id", input.id)
        .eq("processing_status", "received")
        .lt("updated_at", input.cutoffIso)
        .select("id");
      if (error) return false;
      return Boolean(data && data.length > 0);
    },

    async markExhausted(providerEventId) {
      const admin = createAdminClient();
      await admin
        .from("payment_events")
        .update({
          processing_status: "failed",
          last_error_code: "max_attempts",
        })
        .eq("provider_event_id", providerEventId);
    },
  };
}

/**
 * Claim a payment_event for processing without new schema columns.
 * Uses processing_status + updated_at lease + attempt_count.
 */
export async function claimPaymentEvent(
  input: {
    providerEventId: string;
    eventType: string;
    objectId?: string | null;
    nowMs?: number;
    leaseMs?: number;
    maxAttempts?: number;
  },
  store: PaymentEventClaimStore = createSupabasePaymentEventClaimStore(),
): Promise<ClaimPaymentEventResult> {
  const nowMs = input.nowMs ?? Date.now();
  const leaseMs = input.leaseMs ?? PAYMENT_EVENT_LEASE_MS;
  const maxAttempts = input.maxAttempts ?? PAYMENT_EVENT_MAX_ATTEMPTS;
  const cutoffIso = new Date(nowMs - leaseMs).toISOString();

  let existing = await store.getByProviderEventId(input.providerEventId);

  if (!existing) {
    const inserted = await store.insertReceived({
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      objectId: input.objectId ?? null,
    });
    if (inserted === "ok") return "claimed";
    existing = await store.getByProviderEventId(input.providerEventId);
    if (!existing) return "in_flight";
  }

  if (
    existing.processing_status === "processed" ||
    existing.processing_status === "ignored"
  ) {
    return "duplicate";
  }

  if (existing.attempt_count >= maxAttempts) {
    await store.markExhausted(input.providerEventId);
    return "exhausted";
  }

  if (existing.processing_status === "failed") {
    const won = await store.claimFailed({
      id: existing.id,
      nextAttemptCount: existing.attempt_count + 1,
    });
    return won ? "claimed" : "in_flight";
  }

  if (existing.processing_status === "received") {
    const updatedAtMs = Date.parse(existing.updated_at);
    const isFresh =
      Number.isFinite(updatedAtMs) && nowMs - updatedAtMs < leaseMs;
    if (isFresh) return "in_flight";

    const won = await store.claimStaleReceived({
      id: existing.id,
      cutoffIso,
      nextAttemptCount: existing.attempt_count + 1,
    });
    return won ? "claimed" : "in_flight";
  }

  return "in_flight";
}
