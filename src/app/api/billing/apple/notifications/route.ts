import { NextResponse } from "next/server";
import { isAppleIapConfigured } from "@/lib/apple/config";
import { processAppleNotificationV2 } from "@/lib/apple/notifications";
import { logger } from "@/lib/logging/logger";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

/**
 * App Store Server Notifications V2 endpoint.
 * Body: { signedPayload: string }
 */
export async function POST(request: Request) {
  const requestId = createRequestId();

  if (!isAppleIapConfigured()) {
    return NextResponse.json(
      {
        code: "apple_not_configured",
        message: "Apple IAP não configurado.",
        requestId,
      },
      { status: 503, headers: HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_json", message: "JSON inválido.", requestId },
      { status: 400, headers: HEADERS },
    );
  }

  const signedPayload =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    typeof (body as { signedPayload?: unknown }).signedPayload === "string"
      ? (body as { signedPayload: string }).signedPayload.trim()
      : "";

  if (!signedPayload) {
    return NextResponse.json(
      {
        code: "signed_payload_required",
        message: "signedPayload é obrigatório.",
        requestId,
      },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await processAppleNotificationV2(signedPayload);
  if (!result.ok) {
    logger.warn("apple_notification_http_rejected", {
      requestId,
      code: result.code,
    });
    return NextResponse.json(
      { code: result.code, message: result.message, requestId },
      { status: result.httpStatus, headers: HEADERS },
    );
  }

  // 200 even for duplicates — prevents Apple infinite retries after success.
  return NextResponse.json(
    { ok: true, duplicate: Boolean(result.duplicate), requestId },
    { status: 200, headers: HEADERS },
  );
}

export async function GET() {
  return NextResponse.json(
    { code: "method_not_allowed", message: "Use POST." },
    { status: 405, headers: { ...HEADERS, Allow: "POST" } },
  );
}
