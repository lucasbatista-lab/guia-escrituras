import "server-only";

import { cache } from "react";
import type { PlanKey } from "@/lib/entitlements";
import {
  resolveEffectiveSubscription,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function mapSubscriptionRow(row: Record<string, unknown>): SubscriptionCandidate {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    planKey: row.plan_key as PlanKey,
    status: row.status as string,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const loadUserSubscriptionsCached = cache(
  async (
    userId: string,
    useAdmin: boolean,
  ): Promise<SubscriptionCandidate[]> => {
    const client = useAdmin ? createAdminClient() : await createClient();
    if (!client) return [];

    const { data, error } = await client
      .from("subscriptions")
      .select(
        "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
      )
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((row) => mapSubscriptionRow(row as Record<string, unknown>));
  },
);

/** Request-scoped memoization — auth + journey must not double-hit subscriptions. */
export async function loadUserSubscriptions(
  userId: string,
  options?: { useAdmin?: boolean },
): Promise<SubscriptionCandidate[]> {
  return loadUserSubscriptionsCached(userId, Boolean(options?.useAdmin));
}

export async function getEffectiveSubscriptionForUser(
  userId: string,
  options?: { useAdmin?: boolean },
) {
  const rows = await loadUserSubscriptions(userId, options);
  return resolveEffectiveSubscription(rows);
}

export async function userHasBillingCustomer(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("billing_customers")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data?.user_id);
  } catch {
    return false;
  }
}
