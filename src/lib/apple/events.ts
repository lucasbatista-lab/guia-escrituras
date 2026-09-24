import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppleIapEnvironment } from "@/lib/apple/config";
import { sha256Hex } from "@/lib/apple/persistence";

export type ProviderEventProcessingStatus =
  | "received"
  | "processed"
  | "failed"
  | "ignored"
  | "unmatched";

export type ClaimProviderEventResult =
  | { outcome: "claimed" }
  | { outcome: "duplicate"; status: ProviderEventProcessingStatus }
  | { outcome: "failed"; message: string };

/**
 * Insert-first idempotency for Apple (and future) provider events.
 * UNIQUE(provider, environment, external_event_id).
 */
export async function claimBillingProviderEvent(input: {
  provider: "apple" | "stripe";
  environment: AppleIapEnvironment | "unknown";
  externalEventId: string;
  eventType: string;
  eventSignedAt: string | null;
  payloadForHash: string;
  relatedOriginalTransactionId?: string | null;
}): Promise<ClaimProviderEventResult> {
  const admin = createAdminClient();
  const payloadSha256 = sha256Hex(input.payloadForHash);

  const { error } = await admin.from("billing_provider_events").insert({
    provider: input.provider,
    environment: input.environment,
    external_event_id: input.externalEventId,
    event_type: input.eventType,
    event_signed_at: input.eventSignedAt,
    processing_status: "received",
    payload_sha256: payloadSha256,
    related_original_transaction_id:
      input.relatedOriginalTransactionId ?? null,
  });

  if (!error) return { outcome: "claimed" };

  const { data } = await admin
    .from("billing_provider_events")
    .select("processing_status")
    .eq("provider", input.provider)
    .eq("environment", input.environment)
    .eq("external_event_id", input.externalEventId)
    .maybeSingle();

  if (data?.processing_status) {
    return {
      outcome: "duplicate",
      status: data.processing_status as ProviderEventProcessingStatus,
    };
  }

  return {
    outcome: "failed",
    message: error.message || "provider_event_claim_failed",
  };
}

export async function markBillingProviderEvent(input: {
  provider: "apple" | "stripe";
  environment: AppleIapEnvironment | "unknown";
  externalEventId: string;
  status: ProviderEventProcessingStatus;
  relatedUserId?: string | null;
  relatedOriginalTransactionId?: string | null;
  lastErrorCode?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("billing_provider_events")
    .update({
      processing_status: input.status,
      related_user_id: input.relatedUserId ?? null,
      related_original_transaction_id:
        input.relatedOriginalTransactionId ?? null,
      last_error_code: input.lastErrorCode ?? null,
      processed_at:
        input.status === "processed" ||
        input.status === "ignored" ||
        input.status === "unmatched"
          ? new Date().toISOString()
          : null,
    })
    .eq("provider", input.provider)
    .eq("environment", input.environment)
    .eq("external_event_id", input.externalEventId);
}
