import "server-only";

import type Stripe from "stripe";
import type { PlanKey } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { createRequestId } from "@/lib/utils";
import {
  mapStripeSubscriptionStatus,
  markPaymentEvent,
  recordPaymentEvent,
  updateReferralOnInvoicePaid,
  upsertSubscriptionFromStripe,
} from "./persistence";

function planKeyFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
): PlanKey | null {
  const key = metadata?.plan_key?.trim();
  if (
    key === "essencial" ||
    key === "caminho" ||
    key === "profundo" ||
    key === "particular"
  ) {
    return key;
  }
  return null;
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<void> {
  const requestId = createRequestId();
  const recordState = await recordPaymentEvent({
    providerEventId: event.id,
    eventType: event.type,
    objectId:
      typeof event.data.object === "object" &&
      event.data.object &&
      "id" in event.data.object
        ? String((event.data.object as { id: string }).id)
        : null,
  });

  if (recordState === "duplicate") {
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice, requestId);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        await markPaymentEvent(event.id, "ignored");
        return;
    }
    await markPaymentEvent(event.id, "processed");
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    logger.error("stripe_webhook_failed", { requestId, eventType: event.type, code });
    await markPaymentEvent(event.id, "failed", code);
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planKey = planKeyFromMetadata(session.metadata);
  const intentId = session.metadata?.signup_intent_id;
  if (!userId || !planKey) return;

  const admin = createAdminClient();
  if (intentId) {
    await admin
      .from("signup_intents")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", intentId);
  }
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  const planKey = planKeyFromMetadata(subscription.metadata);
  if (!userId || !planKey) return;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const periodEnd = subscription.items.data[0]?.current_period_end;
  await upsertSubscriptionFromStripe({
    userId,
    planKey,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

function invoiceSequenceNumber(invoice: Stripe.Invoice): number {
  if (typeof invoice.number === "number") return invoice.number;
  if (typeof invoice.number === "string") {
    const parsed = Number.parseInt(invoice.number, 10);
    return Number.isFinite(parsed) ? parsed : 1;
  }
  return 1;
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  requestId: string,
) {
  const userId = invoice.metadata?.user_id;
  if (!userId && invoice.customer) {
    const admin = createAdminClient();
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer.id;
    const { data: billing } = await admin
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (billing?.user_id) {
      await updateReferralOnInvoicePaid(
        billing.user_id,
        invoiceSequenceNumber(invoice),
        requestId,
      );
    }
    return;
  }

  if (userId) {
    await updateReferralOnInvoicePaid(userId, invoiceSequenceNumber(invoice), requestId);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
}
