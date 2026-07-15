import "server-only";

import type Stripe from "stripe";
import { logger } from "@/lib/logging/logger";
import { maskStripeId, maskUserId } from "@/lib/logging/mask";
import { createRequestId } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimPaymentEvent,
  type ClaimPaymentEventResult,
} from "./payment-event-claim";
import {
  extractStripeCustomerId,
  extractStripePriceId,
  planKeyFromMetadata,
  resolvePlanKeyFromPriceAndMetadata,
  resolveUserIdForStripeCustomer,
  WebhookBindingError,
} from "./webhook-binding";
import {
  lookupUserIdByStripeCustomerId,
  mapStripeSubscriptionStatus,
  markPaymentEvent,
  updateReferralOnInvoicePaid,
  upsertSubscriptionFromStripe,
} from "./persistence";

export type StripeWebhookHandleResult =
  | "ok"
  | "duplicate"
  | "in_flight"
  | "exhausted"
  | "rejected";

function subscriptionPriceId(
  subscription: Stripe.Subscription,
): string | null {
  const item = subscription.items?.data?.[0];
  if (!item) return null;
  return extractStripePriceId(item.price);
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookHandleResult> {
  const requestId = createRequestId();
  const objectId =
    typeof event.data.object === "object" &&
    event.data.object &&
    "id" in event.data.object
      ? String((event.data.object as { id: string }).id)
      : null;

  const claim: ClaimPaymentEventResult = await claimPaymentEvent({
    providerEventId: event.id,
    eventType: event.type,
    objectId,
  });

  if (claim === "duplicate") return "duplicate";
  if (claim === "in_flight") return "in_flight";
  if (claim === "exhausted") {
    logger.error("stripe_webhook_attempts_exhausted", {
      requestId,
      eventType: event.type,
      eventIdPrefix:
        typeof event.id === "string" ? event.id.slice(0, 8) : undefined,
    });
    return "exhausted";
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          requestId,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
          requestId,
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
        return "ok";
    }
    await markPaymentEvent(event.id, "processed");
    return "ok";
  } catch (error) {
    if (error instanceof WebhookBindingError) {
      logger.error("stripe_webhook_binding_rejected", {
        requestId,
        eventType: event.type,
        code: error.code,
        eventIdPrefix:
          typeof event.id === "string" ? event.id.slice(0, 8) : undefined,
      });
      await markPaymentEvent(event.id, "failed", error.code);
      if (!error.retryable) {
        // Permanent mismatch — do not grant; ACK so Stripe stops retrying.
        return "rejected";
      }
      throw error;
    }

    const code = error instanceof Error ? error.message.slice(0, 120) : "unknown";
    logger.error("stripe_webhook_failed", {
      requestId,
      eventType: event.type,
      code,
      eventIdPrefix:
        typeof event.id === "string" ? event.id.slice(0, 8) : undefined,
    });
    await markPaymentEvent(event.id, "failed", code);
    throw error;
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  requestId: string,
) {
  const customerId = extractStripeCustomerId(session.customer);
  const userId = await resolveUserIdForStripeCustomer({
    customerId,
    metadataUserId: session.metadata?.user_id ?? null,
    lookupUserIdByCustomerId: lookupUserIdByStripeCustomerId,
  });

  logger.info("stripe_checkout_completed_bound", {
    requestId,
    userId: maskUserId(userId),
    customerId: maskStripeId(customerId),
    sessionId: maskStripeId(session.id),
  });

  const intentId = session.metadata?.signup_intent_id?.trim() || null;
  if (!intentId) return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("signup_intents")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw new Error("intent_update_failed");
  }
  if (!data || data.length === 0) {
    // Intent missing or belongs to another user — do not complete wrong intent.
    throw new WebhookBindingError("user_mismatch");
  }
}

async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
  requestId: string,
) {
  const customerId = extractStripeCustomerId(subscription.customer);
  const userId = await resolveUserIdForStripeCustomer({
    customerId,
    metadataUserId: subscription.metadata?.user_id ?? null,
    lookupUserIdByCustomerId: lookupUserIdByStripeCustomerId,
  });

  const planKey = resolvePlanKeyFromPriceAndMetadata({
    priceId: subscriptionPriceId(subscription),
    metadataPlanKey: planKeyFromMetadata(subscription.metadata),
  });

  const periodEnd = subscription.items.data[0]?.current_period_end;

  await upsertSubscriptionFromStripe({
    userId,
    planKey,
    stripeCustomerId: customerId!,
    stripeSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  });

  logger.info("stripe_subscription_upsert_bound", {
    requestId,
    userId: maskUserId(userId),
    customerId: maskStripeId(customerId),
    subscriptionId: maskStripeId(subscription.id),
    planKey,
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
  const customerId = extractStripeCustomerId(invoice.customer);
  const userId = await resolveUserIdForStripeCustomer({
    customerId,
    metadataUserId: invoice.metadata?.user_id ?? null,
    lookupUserIdByCustomerId: lookupUserIdByStripeCustomerId,
  });

  await updateReferralOnInvoicePaid(
    userId,
    invoiceSequenceNumber(invoice),
    requestId,
  );
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
