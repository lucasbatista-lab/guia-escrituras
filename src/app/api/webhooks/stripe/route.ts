import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import {
  getConfiguredStripeMode,
  getStripeWebhookSecret,
} from "@/lib/stripe/config";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhook";
import {
  assertEventMatchesKeyMode,
  StripeModeMismatchError,
} from "@/lib/stripe/key-mode";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Mode check AFTER signature verification and BEFORE any persistence.
  try {
    const keyMode = getConfiguredStripeMode();
    assertEventMatchesKeyMode(event, keyMode);
  } catch (error) {
    if (error instanceof StripeModeMismatchError) {
      logger.warn("stripe_webhook_mode_mismatch", {
        eventType: event.type,
        eventLivemode: event.livemode,
        // Never log secrets or full event payloads.
        eventIdPrefix:
          typeof event.id === "string" ? event.id.slice(0, 8) : undefined,
      });
      return NextResponse.json({ error: "mode_mismatch" }, { status: 400 });
    }
    return NextResponse.json({ error: "mode_check_failed" }, { status: 503 });
  }

  try {
    const result = await handleStripeWebhookEvent(event);
    if (result === "in_flight") {
      // Another worker holds the lease — do not ACK; Stripe may retry later.
      return NextResponse.json({ error: "in_flight" }, { status: 409 });
    }
    if (result === "exhausted") {
      // Cap reached — keep non-2xx so operators notice via Stripe dashboard.
      return NextResponse.json({ error: "attempts_exhausted" }, { status: 500 });
    }
    // ok | duplicate | rejected(permanent binding) → ACK
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
