import { NextResponse } from "next/server";
import {
  getWhatsAppAppSecret,
  getWhatsAppVerifyToken,
  isWhatsAppChannelEnabled,
} from "@/lib/whatsapp/config";
import {
  safeEqualString,
  verifyWhatsAppSignature,
} from "@/lib/whatsapp/crypto";
import { receiveWhatsAppWebhookPayload } from "@/lib/whatsapp/receive";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

export const runtime = "nodejs";

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * GET — hub challenge (allowed when verify token is configured, even if
 *       WHATSAPP_CHANNEL_ENABLED is false, so the app can be registered offline).
 * POST — when channel disabled → 503 whatsapp_channel_disabled (no persist).
 *        Documented: Meta may retry; foundation stays inert until flag is on.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!mode || !token || !challenge) {
    logWhatsAppOps("verify_failed", { reason: "missing_params" });
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (mode !== "subscribe") {
    logWhatsAppOps("verify_failed", { reason: "bad_mode" });
    return new NextResponse("Bad Request", { status: 400 });
  }

  const expected = getWhatsAppVerifyToken();
  if (!expected) {
    logWhatsAppOps("verify_failed", { reason: "verify_token_unset" });
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!safeEqualString(token, expected)) {
    logWhatsAppOps("verify_failed", { reason: "token_mismatch" });
    return new NextResponse("Forbidden", { status: 403 });
  }

  logWhatsAppOps("verify_ok");
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  if (!isWhatsAppChannelEnabled()) {
    logWhatsAppOps("channel_disabled");
    return NextResponse.json(
      { error: "whatsapp_channel_disabled" },
      { status: 503 },
    );
  }

  const appSecret = getWhatsAppAppSecret();
  if (!appSecret) {
    logWhatsAppOps("signature_rejected", { reason: "app_secret_unset" });
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  const rawBody = await request.text();

  if (
    !verifyWhatsAppSignature({
      rawBody,
      signatureHeader: signature,
      appSecret,
    })
  ) {
    logWhatsAppOps("signature_rejected");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await receiveWhatsAppWebhookPayload({ payload });
    return NextResponse.json({
      received: true,
      accepted: result.accepted,
      duplicates: result.duplicates,
      pendingIdentity: result.pendingIdentity,
      statusesApplied: result.statusesApplied,
      statusesIgnored: result.statusesIgnored,
    });
  } catch {
    logWhatsAppOps("processing_failed", { reason: "unhandled" });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
