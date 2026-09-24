import "server-only";

import { loadAppleSubscriptionsForUser } from "@/lib/apple/persistence";
import { appleAccessStatusGrantsAccess } from "@/lib/apple/status";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";

/**
 * Provider-composable billing stop for account deletion.
 *
 * Stripe: cancel_at_period_end (see ensureRecurringBillingStoppedForDeletion).
 * Apple: server cannot cancel auto-renew like Stripe — detect granting rows,
 * log explicitly, and do NOT pretend they were cancelled.
 */

export type RecurringBillingStopResult =
  | { ok: true; stoppedCount: number; alreadyStoppedCount: number }
  | {
      ok: false;
      code: "subscription_cancel_failed";
      message: string;
    };

export type RecurringBillingStopPort = {
  stopForUser(userId: string): Promise<RecurringBillingStopResult>;
};

/**
 * Run every registered billing-stop port before Auth wipe.
 * Any failure aborts — never delete Auth with orphan recurring Stripe charges.
 */
export async function composeRecurringBillingStops(
  userId: string,
  ports: RecurringBillingStopPort[],
): Promise<RecurringBillingStopResult> {
  let stoppedCount = 0;
  let alreadyStoppedCount = 0;

  for (const port of ports) {
    const result = await port.stopForUser(userId);
    if (!result.ok) return result;
    stoppedCount += result.stoppedCount;
    alreadyStoppedCount += result.alreadyStoppedCount;
  }

  return { ok: true, stoppedCount, alreadyStoppedCount };
}

/**
 * Apple deletion port — does not cancel StoreKit auto-renew.
 * Counts granting rows for observability (alreadyStoppedCount).
 */
export const appleRecurringBillingStopPort: RecurringBillingStopPort = {
  async stopForUser(userId: string) {
    try {
      const rows = await loadAppleSubscriptionsForUser(userId);
      const granting = rows.filter((row) =>
        appleAccessStatusGrantsAccess(row.accessStatus),
      );
      if (granting.length > 0) {
        logger.info("apple_account_deletion_auto_renew_note", {
          userId: maskUserId(userId),
          grantingCount: granting.length,
          note: "Apple auto-renew cannot be cancelled server-side; manage via App Store.",
        });
      }
      return {
        ok: true,
        stoppedCount: 0,
        alreadyStoppedCount: granting.length,
      };
    } catch {
      // Table may be absent pre-migration — do not block Stripe deletion path.
      return { ok: true, stoppedCount: 0, alreadyStoppedCount: 0 };
    }
  },
};

/** @deprecated alias */
export const appleRecurringBillingStopStub = appleRecurringBillingStopPort;
