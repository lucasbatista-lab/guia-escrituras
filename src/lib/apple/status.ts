import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import type { AppleIapEnvironment } from "@/lib/apple/config";

/**
 * Normalized Apple access status persisted in apple_subscriptions.access_status.
 *
 * Policy (explicit):
 * - active: grants access
 * - grace: grants access (Apple Billing Grace Period)
 * - billing_retry: does NOT grant (outside grace / retry without access window)
 * - expired / revoked: do NOT grant
 */
export type AppleAccessStatus =
  | "active"
  | "grace"
  | "expired"
  | "revoked"
  | "billing_retry";

export type AppleSubscriptionRecord = {
  id: string;
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
  lastSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function appleAccessStatusGrantsAccess(
  status: AppleAccessStatus,
): boolean {
  return status === "active" || status === "grace";
}

/**
 * Map verified JWS transaction fields → normalized access status.
 */
export function normalizeAppleAccessStatus(input: {
  revocationDate?: number | null;
  expiresDate?: number | null;
  gracePeriodExpiresDate?: number | null;
  nowMs?: number;
}): AppleAccessStatus {
  const now = input.nowMs ?? Date.now();

  if (input.revocationDate != null) {
    return "revoked";
  }

  const grace = input.gracePeriodExpiresDate;
  if (grace != null && grace > now) {
    return "grace";
  }

  const expires = input.expiresDate;
  if (expires == null) {
    // Non-expiring unexpected for auto-renewable — fail closed.
    return "expired";
  }
  if (expires > now) {
    return "active";
  }

  // Expired without active grace → no access (billing retry does not grant).
  return "expired";
}

/** AccessCandidate.status for the shared resolver (active|canceled only). */
export function appleAccessStatusToResolverStatus(
  status: AppleAccessStatus,
): "active" | "canceled" {
  return appleAccessStatusGrantsAccess(status) ? "active" : "canceled";
}

export function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}
