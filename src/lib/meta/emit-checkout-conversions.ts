import "server-only";

import type Stripe from "stripe";
import { logger } from "@/lib/logging/logger";
import { getStripeClient } from "@/lib/stripe/client";
import { sendMetaCapiEvent } from "./capi";
import {
  sanitizeEventId,
  sanitizeEventSourceUrl,
  sanitizeFbc,
  sanitizeFbp,
} from "./capi-sanitize";
import { META_SESSION_META } from "./ads-checkout-context";
import type { AdsCheckoutContext } from "./ads-checkout-context";
import {
  extractClientIpFromHeaders,
  extractClientUserAgentFromHeaders,
  sanitizeClientIp,
  sanitizeClientUserAgent,
  truncateStripeMetadataValue,
} from "./request-client";

export type CapiCheckoutUserContext = {
  userId: string;
  email: string | null;
  clientIp: string | null;
  clientUa: string | null;
};

export type CapiServerRequestContext = {
  clientIp: string | null;
  clientUa: string | null;
};

/** Capture client IP/UA from the checkout server action request. */
export function captureCapiRequestContext(headers: {
  get(name: string): string | null;
}): CapiServerRequestContext {
  return {
    clientIp: extractClientIpFromHeaders(headers),
    clientUa: extractClientUserAgentFromHeaders(headers),
  };
}

/** Build non-financial session metadata when advertising is consented. */
export function buildAdsSessionMetadata(
  ads: AdsCheckoutContext | null | undefined,
  requestContext?: CapiServerRequestContext | null,
): Record<string, string> {
  if (!ads?.advertisingConsent) {
    return {};
  }

  const out: Record<string, string> = {
    [META_SESSION_META.consent]: "granted",
  };

  const sourceUrl = sanitizeEventSourceUrl(ads.eventSourceUrl);
  if (sourceUrl) out[META_SESSION_META.eventSourceUrl] = sourceUrl;

  const fbp = sanitizeFbp(ads.fbp);
  if (fbp) out[META_SESSION_META.fbp] = fbp;

  const fbc = sanitizeFbc(ads.fbc);
  if (fbc) out[META_SESSION_META.fbc] = fbc;

  const eventId = sanitizeEventId(ads.eventId);
  if (eventId) out[META_SESSION_META.initiateEventId] = eventId;

  const ip = sanitizeClientIp(requestContext?.clientIp);
  if (ip) {
    out[META_SESSION_META.clientIp] = truncateStripeMetadataValue(ip);
  }

  const ua = sanitizeClientUserAgent(requestContext?.clientUa);
  if (ua) {
    out[META_SESSION_META.clientUa] = truncateStripeMetadataValue(ua);
  }

  return out;
}

function sessionAmountMajor(session: Stripe.Checkout.Session): {
  value: number | undefined;
  currency: string | undefined;
} {
  const currency = session.currency?.toUpperCase();
  if (
    typeof session.amount_total === "number" &&
    Number.isFinite(session.amount_total) &&
    currency
  ) {
    return {
      value: session.amount_total / 100,
      currency,
    };
  }
  return { value: undefined, currency: undefined };
}

function userDataFromSessionMetadata(
  session: Stripe.Checkout.Session,
  email: string | null,
  userId: string | null,
): {
  email?: string;
  userId?: string;
  fbp?: string;
  fbc?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
} {
  const meta = session.metadata ?? {};
  const out: {
    email?: string;
    userId?: string;
    fbp?: string;
    fbc?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
  } = {};

  if (email) out.email = email;
  if (userId) out.userId = userId;

  const fbp = sanitizeFbp(meta[META_SESSION_META.fbp]);
  if (fbp) out.fbp = fbp;

  const fbc = sanitizeFbc(meta[META_SESSION_META.fbc]);
  if (fbc) out.fbc = fbc;

  const ip = sanitizeClientIp(meta[META_SESSION_META.clientIp]);
  if (ip) out.clientIpAddress = ip;

  const ua = sanitizeClientUserAgent(meta[META_SESSION_META.clientUa]);
  if (ua) out.clientUserAgent = ua;

  return out;
}

async function resolvePurchaseEmail(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const fromDetails = session.customer_details?.email?.trim();
  if (fromDetails) return fromDetails;

  const fromSession = session.customer_email?.trim();
  if (fromSession) return fromSession;

  const customerRef = session.customer;
  const customerId =
    typeof customerRef === "string"
      ? customerRef
      : customerRef && typeof customerRef === "object" && "id" in customerRef
        ? String(customerRef.id)
        : null;

  if (!customerId) return null;

  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(customerId);
    if (
      customer &&
      !("deleted" in customer && customer.deleted) &&
      typeof customer.email === "string" &&
      customer.email.trim()
    ) {
      return customer.email.trim();
    }
  } catch {
    // Best-effort — Purchase still fires with external_id when email unavailable.
  }

  return null;
}

/**
 * InitiateCheckout after a real Checkout Session create.
 * Never throws — advertising failures must not affect checkout.
 */
export async function emitInitiateCheckoutSafe(
  session: Stripe.Checkout.Session,
  ads: AdsCheckoutContext | null | undefined,
  userContext: CapiCheckoutUserContext,
): Promise<void> {
  try {
    if (!ads?.advertisingConsent) return;

    const eventId =
      sanitizeEventId(ads.eventId) ||
      sanitizeEventId(session.id) ||
      `ic_${Date.now()}`;
    const sourceUrl = sanitizeEventSourceUrl(ads.eventSourceUrl);
    const amount = sessionAmountMajor(session);

    await sendMetaCapiEvent({
      eventName: "InitiateCheckout",
      eventId,
      eventTime: Math.floor(Date.now() / 1000),
      eventSourceUrl: sourceUrl,
      actionSource: "website",
      userData: {
        email: userContext.email ?? undefined,
        userId: userContext.userId,
        fbp: sanitizeFbp(ads.fbp) ?? undefined,
        fbc: sanitizeFbc(ads.fbc) ?? undefined,
        clientIpAddress: userContext.clientIp ?? undefined,
        clientUserAgent: userContext.clientUa ?? undefined,
      },
      customData: {
        value: amount.value,
        currency: amount.currency,
      },
    });
  } catch (error) {
    logger.info("meta_capi_failed", {
      event_name: "InitiateCheckout",
      event_id: ads?.eventId?.slice(0, 64),
      status: "failed",
      code: "emit_swallowed",
    });
    void error;
  }
}

/**
 * Purchase only after confirmed checkout.session.completed processing.
 * Uses Stripe event.id as idempotent event_id. Never throws.
 *
 * Dedup note: Purchase is server-side only in this version — no browser
 * Purchase mirror — so event_id + payment_events claim prevent duplicates.
 */
export async function emitPurchaseConversionSafe(
  session: Stripe.Checkout.Session,
  providerEventId: string,
  providerEventTime?: number,
): Promise<void> {
  try {
    const consent = session.metadata?.[META_SESSION_META.consent];
    if (consent !== "granted") return;

    const eventId = sanitizeEventId(providerEventId);
    if (!eventId) return;

    const amount = sessionAmountMajor(session);
    if (amount.value === undefined || !amount.currency) {
      logger.info("meta_capi_rejected", {
        event_name: "Purchase",
        event_id: eventId.slice(0, 64),
        status: "rejected",
        code: "amount_missing",
      });
      return;
    }

    const userId = session.metadata?.user_id?.trim() || null;
    const email = await resolvePurchaseEmail(session);

    const eventTime =
      typeof providerEventTime === "number" &&
      Number.isFinite(providerEventTime) &&
      providerEventTime > 0
        ? providerEventTime
        : Math.floor(Date.now() / 1000);

    await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId,
      eventTime,
      eventSourceUrl: sanitizeEventSourceUrl(
        session.metadata?.[META_SESSION_META.eventSourceUrl],
      ),
      actionSource: "website",
      userData: userDataFromSessionMetadata(session, email, userId),
      customData: {
        value: amount.value,
        currency: amount.currency,
      },
    });
  } catch (error) {
    logger.info("meta_capi_failed", {
      event_name: "Purchase",
      event_id: providerEventId.slice(0, 64),
      status: "failed",
      code: "emit_swallowed",
    });
    void error;
  }
}
