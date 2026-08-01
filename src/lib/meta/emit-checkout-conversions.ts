import "server-only";

import type Stripe from "stripe";
import { logger } from "@/lib/logging/logger";
import { sendMetaCapiEvent } from "./capi";
import {
  sanitizeEventId,
  sanitizeEventSourceUrl,
  sanitizeFbc,
  sanitizeFbp,
} from "./capi-sanitize";
import { META_SESSION_META } from "./ads-checkout-context";
import type { AdsCheckoutContext } from "./ads-checkout-context";

/** Build non-financial session metadata when advertising is consented. */
export function buildAdsSessionMetadata(
  ads: AdsCheckoutContext | null | undefined,
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

/**
 * InitiateCheckout after a real Checkout Session create.
 * Never throws — advertising failures must not affect checkout.
 */
export async function emitInitiateCheckoutSafe(
  session: Stripe.Checkout.Session,
  ads: AdsCheckoutContext | null | undefined,
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
        fbp: sanitizeFbp(ads.fbp) ?? undefined,
        fbc: sanitizeFbc(ads.fbc) ?? undefined,
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

    await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId,
      eventTime: Math.floor(Date.now() / 1000),
      eventSourceUrl: sanitizeEventSourceUrl(
        session.metadata?.[META_SESSION_META.eventSourceUrl],
      ),
      actionSource: "website",
      userData: {
        fbp:
          sanitizeFbp(session.metadata?.[META_SESSION_META.fbp]) ?? undefined,
        fbc:
          sanitizeFbc(session.metadata?.[META_SESSION_META.fbc]) ?? undefined,
      },
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
