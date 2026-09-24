import "server-only";

/**
 * Provider-composable billing stop for account deletion.
 *
 * ACCESS vs BILLING:
 * - Stopping a provider's renewal is a billing action.
 * - Entitlement/access is resolved separately via getEffectiveAccessForUser.
 *
 * Stripe today: cancel_at_period_end (see ensureRecurringBillingStoppedForDeletion).
 * Apple future: cannot mirror Stripe server cancel; detect auto-renew, guide user
 * to Apple subscription management, then allow Auth delete per product policy.
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
 * Any failure aborts — never delete Auth with orphan recurring charges.
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
 * Placeholder Apple port — not wired. Returns ok with zero stops until
 * App Store Server API integration exists. Must not invent fake cancels.
 */
export const appleRecurringBillingStopStub: RecurringBillingStopPort = {
  async stopForUser() {
    return { ok: true, stoppedCount: 0, alreadyStoppedCount: 0 };
  },
};
