import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppleIapEnvironment } from "@/lib/apple/config";
import type {
  AppleAccessStatus,
  AppleSubscriptionRecord,
} from "@/lib/apple/status";
import type { PlanKey } from "@/lib/entitlements";

function mapRow(row: Record<string, unknown>): AppleSubscriptionRecord {
  return {
    id: row.id as string,
    userId: (row.user_id as string | null) ?? null,
    environment: row.environment as AppleIapEnvironment,
    originalTransactionId: row.original_transaction_id as string,
    productId: row.product_id as string,
    planKey: row.plan_key as PlanKey,
    accessStatus: row.access_status as AppleAccessStatus,
    appleStatus: (row.apple_status as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    gracePeriodExpiresAt: (row.grace_period_expires_at as string | null) ?? null,
    autoRenewEnabled:
      typeof row.auto_renew_enabled === "boolean"
        ? row.auto_renew_enabled
        : null,
    lastSignedAt: (row.last_signed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function loadAppleSubscriptionsForUser(
  userId: string,
): Promise<AppleSubscriptionRecord[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("apple_subscriptions")
      .select("*")
      .eq("user_id", userId);
    if (error || !data) return [];
    return data.map((row) => mapRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function findAppleSubscriptionByOriginal(input: {
  environment: AppleIapEnvironment;
  originalTransactionId: string;
}): Promise<AppleSubscriptionRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("apple_subscriptions")
    .select("*")
    .eq("environment", input.environment)
    .eq("original_transaction_id", input.originalTransactionId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export type UpsertAppleSubscriptionInput = {
  userId: string | null;
  environment: AppleIapEnvironment;
  originalTransactionId: string;
  productId: string;
  planKey: PlanKey;
  accessStatus: AppleAccessStatus;
  appleStatus: string | null;
  expiresAt: string | null;
  gracePeriodExpiresAt: string | null;
  autoRenewEnabled: boolean | null;
  signedAt: string | null;
};

/**
 * Upsert by (environment, originalTransactionId).
 * Out-of-order guard: ignore updates when incoming signedAt is older than stored.
 */
export async function upsertAppleSubscriptionState(
  input: UpsertAppleSubscriptionInput,
): Promise<{ applied: boolean; record: AppleSubscriptionRecord | null }> {
  const existing = await findAppleSubscriptionByOriginal({
    environment: input.environment,
    originalTransactionId: input.originalTransactionId,
  });

  if (existing?.lastSignedAt && input.signedAt) {
    const existingMs = new Date(existing.lastSignedAt).getTime();
    const incomingMs = new Date(input.signedAt).getTime();
    if (
      Number.isFinite(existingMs) &&
      Number.isFinite(incomingMs) &&
      incomingMs < existingMs
    ) {
      return { applied: false, record: existing };
    }
  }

  // Preserve existing owner if incoming userId is null (notification without claim).
  const userId = input.userId ?? existing?.userId ?? null;

  const admin = createAdminClient();
  const payload = {
    user_id: userId,
    environment: input.environment,
    original_transaction_id: input.originalTransactionId,
    product_id: input.productId,
    plan_key: input.planKey,
    access_status: input.accessStatus,
    apple_status: input.appleStatus,
    expires_at: input.expiresAt,
    grace_period_expires_at: input.gracePeriodExpiresAt,
    auto_renew_enabled: input.autoRenewEnabled,
    last_signed_at: input.signedAt,
  };

  const { data, error } = await admin
    .from("apple_subscriptions")
    .upsert(payload, {
      onConflict: "environment,original_transaction_id",
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "apple_subscription_upsert_failed");
  }

  return { applied: true, record: mapRow(data as Record<string, unknown>) };
}

export async function bindAppleSubscriptionOwner(input: {
  environment: AppleIapEnvironment;
  originalTransactionId: string;
  userId: string;
}): Promise<
  | { ok: true; idempotent: boolean }
  | { ok: false; code: "conflict" | "not_found" }
> {
  const existing = await findAppleSubscriptionByOriginal({
    environment: input.environment,
    originalTransactionId: input.originalTransactionId,
  });
  if (!existing) return { ok: false, code: "not_found" };
  if (existing.userId === input.userId) {
    return { ok: true, idempotent: true };
  }
  if (existing.userId && existing.userId !== input.userId) {
    return { ok: false, code: "conflict" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("apple_subscriptions")
    .update({ user_id: input.userId })
    .eq("environment", input.environment)
    .eq("original_transaction_id", input.originalTransactionId)
    .is("user_id", null);

  if (error) {
    // Unique race / concurrent bind
    const again = await findAppleSubscriptionByOriginal({
      environment: input.environment,
      originalTransactionId: input.originalTransactionId,
    });
    if (again?.userId === input.userId) return { ok: true, idempotent: true };
    if (again?.userId && again.userId !== input.userId) {
      return { ok: false, code: "conflict" };
    }
    return { ok: false, code: "conflict" };
  }

  return { ok: true, idempotent: false };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
