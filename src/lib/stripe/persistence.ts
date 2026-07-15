import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import type { SubscriptionStatus } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionReferralStatus } from "@/lib/referrals";
import { logger } from "@/lib/logging/logger";
import {
  claimPaymentEvent,
  createSupabasePaymentEventClaimStore,
} from "./payment-event-claim";

export {
  claimPaymentEvent,
  PAYMENT_EVENT_LEASE_MS,
  PAYMENT_EVENT_MAX_ATTEMPTS,
  type ClaimPaymentEventResult,
  type PaymentEventClaimStore,
} from "./payment-event-claim";

export function mapStripeSubscriptionStatus(
  stripeStatus: string,
): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "unpaid";
  }
}

export async function upsertSubscriptionFromStripe(input: {
  userId: string;
  planKey: PlanKey;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", input.stripeSubscriptionId)
    .maybeSingle();

  const row = {
    user_id: input.userId,
    plan_key: input.planKey,
    status: input.status,
    stripe_customer_id: input.stripeCustomerId,
    stripe_subscription_id: input.stripeSubscriptionId,
    current_period_end: input.currentPeriodEnd,
  };

  if (existing?.id) {
    await admin.from("subscriptions").update(row).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert(row);
  }
}

/** @deprecated Prefer claimPaymentEvent — kept for narrow compatibility. */
export async function recordPaymentEvent(input: {
  providerEventId: string;
  eventType: string;
  objectId?: string | null;
}): Promise<"new" | "duplicate" | "retry_failed"> {
  const result = await claimPaymentEvent(
    {
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      objectId: input.objectId,
    },
    createSupabasePaymentEventClaimStore(),
  );
  if (result === "claimed") {
    // Distinguish first insert vs reclaim is not needed by callers of this shim.
    return "new";
  }
  if (result === "duplicate") return "duplicate";
  // in_flight / exhausted map to duplicate for the old API shape.
  return "duplicate";
}

export async function markPaymentEvent(
  providerEventId: string,
  status: "processed" | "failed" | "ignored",
  errorCode?: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("payment_events")
    .update({
      processing_status: status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      last_error_code: errorCode ?? null,
    })
    .eq("provider_event_id", providerEventId);
}

export async function updateReferralOnInvoicePaid(
  userId: string,
  invoiceNumber: number,
  requestId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: attribution } = await admin
    .from("referral_attributions")
    .select("id, status")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (!attribution) return;

  const current = attribution.status as
    | "attributed"
    | "first_payment_confirmed"
    | "second_payment_confirmed";

  if (invoiceNumber <= 1 && current === "attributed") {
    const next = transitionReferralStatus(current, "first_payment_confirmed");
    if (next.ok && next.status) {
      await admin
        .from("referral_attributions")
        .update({ status: next.status })
        .eq("id", attribution.id);
    }
    return;
  }

  if (invoiceNumber >= 2 && current === "first_payment_confirmed") {
    const second = transitionReferralStatus(
      current,
      "second_payment_confirmed",
    );
    if (!second.ok || !second.status) return;

    const pending = transitionReferralStatus(
      second.status,
      "reward_pending",
    );
    if (pending.ok && pending.status) {
      await admin
        .from("referral_attributions")
        .update({ status: pending.status })
        .eq("id", attribution.id);
      logger.info("referral_reward_pending", { requestId, userId });
    }
  }
}

export async function lookupUserIdByStripeCustomerId(
  customerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}
