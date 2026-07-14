import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import type { SubscriptionStatus } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionReferralStatus } from "@/lib/referrals";
import { logger } from "@/lib/logging/logger";

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

export async function recordPaymentEvent(input: {
  providerEventId: string;
  eventType: string;
  objectId?: string | null;
}): Promise<"new" | "duplicate" | "retry_failed"> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("payment_events")
    .select("id, processing_status, attempt_count")
    .eq("provider_event_id", input.providerEventId)
    .maybeSingle();

  if (existing) {
    if (existing.processing_status === "processed") return "duplicate";
    if (existing.processing_status === "failed") {
      await admin
        .from("payment_events")
        .update({
          processing_status: "received",
          attempt_count: (existing.attempt_count ?? 0) + 1,
          last_error_code: null,
        })
        .eq("id", existing.id);
      return "retry_failed";
    }
    return "duplicate";
  }

  await admin.from("payment_events").insert({
    provider_event_id: input.providerEventId,
    event_type: input.eventType,
    object_id: input.objectId ?? null,
    processing_status: "received",
  });
  return "new";
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
