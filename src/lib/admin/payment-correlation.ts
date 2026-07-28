import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Correlates a Stripe object_id (from payment_events) to at most one user,
 * using only exact technical matches against known Stripe id columns.
 * Never guesses by email/name. Multiple distinct users for the same
 * object_id => ambiguous (uncorrelated), never picked arbitrarily.
 */
export interface PaymentEventCorrelation {
  userId: string | null;
  ambiguous: boolean;
}

const CHUNK_SIZE = 100;

function addMatch(
  byObjectId: Map<string, Set<string>>,
  objectId: string | null | undefined,
  userId: string | null | undefined,
) {
  if (!objectId || !userId) return;
  const set = byObjectId.get(objectId) ?? new Set<string>();
  set.add(userId);
  byObjectId.set(objectId, set);
}

/**
 * Batch-resolve payment_events.object_id values to a user, checking
 * subscriptions (customer + subscription id), billing_customers (customer
 * id), and signup_intents (checkout session id, cs_* only).
 */
export async function correlatePaymentEventsToUsers(
  client: SupabaseClient,
  objectIds: Array<string | null | undefined>,
): Promise<Map<string, PaymentEventCorrelation>> {
  const uniqueIds = [
    ...new Set(
      objectIds
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const result = new Map<string, PaymentEventCorrelation>();
  if (uniqueIds.length === 0) return result;

  const byObjectId = new Map<string, Set<string>>();

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
    const checkoutSessionIds = chunk.filter((id) => id.startsWith("cs_"));

    const [byCustomerSub, bySubscriptionId, byBillingCustomer, byCheckoutSession] =
      await Promise.all([
        client
          .from("subscriptions")
          .select("user_id, stripe_customer_id")
          .in("stripe_customer_id", chunk),
        client
          .from("subscriptions")
          .select("user_id, stripe_subscription_id")
          .in("stripe_subscription_id", chunk),
        client
          .from("billing_customers")
          .select("user_id, stripe_customer_id")
          .in("stripe_customer_id", chunk),
        checkoutSessionIds.length > 0
          ? client
              .from("signup_intents")
              .select("user_id, stripe_checkout_session_id")
              .in("stripe_checkout_session_id", checkoutSessionIds)
          : Promise.resolve({
              data: [] as Array<{
                user_id: string | null;
                stripe_checkout_session_id: string | null;
              }>,
              error: null,
            }),
      ]);

    for (const row of byCustomerSub.data ?? []) {
      addMatch(
        byObjectId,
        row.stripe_customer_id as string | null,
        row.user_id as string | null,
      );
    }
    for (const row of bySubscriptionId.data ?? []) {
      addMatch(
        byObjectId,
        row.stripe_subscription_id as string | null,
        row.user_id as string | null,
      );
    }
    for (const row of byBillingCustomer.data ?? []) {
      addMatch(
        byObjectId,
        row.stripe_customer_id as string | null,
        row.user_id as string | null,
      );
    }
    for (const row of byCheckoutSession.data ?? []) {
      addMatch(
        byObjectId,
        row.stripe_checkout_session_id as string | null,
        row.user_id as string | null,
      );
    }
  }

  for (const objectId of uniqueIds) {
    const matches = byObjectId.get(objectId);
    if (!matches || matches.size === 0) {
      result.set(objectId, { userId: null, ambiguous: false });
    } else if (matches.size === 1) {
      result.set(objectId, { userId: [...matches][0] ?? null, ambiguous: false });
    } else {
      result.set(objectId, { userId: null, ambiguous: true });
    }
  }

  return result;
}
