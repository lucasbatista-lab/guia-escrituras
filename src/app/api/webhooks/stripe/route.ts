import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import { getStripeWebhookSecret } from "@/lib/stripe/config";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhook";

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

  try {
    await handleStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
