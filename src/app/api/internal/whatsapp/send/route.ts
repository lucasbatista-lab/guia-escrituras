import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getWhatsAppOutboundWorkerSecret,
  isWhatsAppChannelEnabled,
  isWhatsAppOutboundEnabled,
  isWhatsAppOutboundSendAllowed,
  WHATSAPP_OUTBOUND_BATCH_DEFAULT,
  WHATSAPP_OUTBOUND_BATCH_MAX,
} from "@/lib/whatsapp/config";
import { processPendingWhatsAppOutbound } from "@/lib/whatsapp/process-outbound";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function safeEqualSecret(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractWorkerSecret(request: Request): string | null {
  const header = request.headers.get("x-whatsapp-outbound-worker-secret");
  if (header?.trim()) return header.trim();
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * Internal outbound sender — not scheduled in this block.
 * Requires WHATSAPP_OUTBOUND_WORKER_SECRET. Never accepts destination/body.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const expected = getWhatsAppOutboundWorkerSecret();
  if (!expected) {
    logWhatsAppOps("worker_unauthorized", { reason: "secret_missing" });
    return NextResponse.json(
      { code: "misconfigured", requestId },
      { status: 503, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const provided = extractWorkerSecret(request);
  if (!provided || !safeEqualSecret(provided, expected)) {
    logWhatsAppOps("worker_unauthorized");
    return NextResponse.json(
      { code: "unauthorized", requestId },
      { status: 401, headers: { ...PRIVATE_HEADERS } },
    );
  }

  if (!isWhatsAppChannelEnabled() || !isWhatsAppOutboundEnabled()) {
    logWhatsAppOps("worker_disabled");
    return NextResponse.json(
      {
        code: "outbound_disabled",
        claimed: 0,
        sent: 0,
        retry: 0,
        failed: 0,
        unknown: 0,
        cancelled: 0,
        requestId,
      },
      { status: 200, headers: { ...PRIVATE_HEADERS } },
    );
  }

  if (!isWhatsAppOutboundSendAllowed()) {
    return NextResponse.json(
      {
        code: "outbound_disabled",
        claimed: 0,
        sent: 0,
        retry: 0,
        failed: 0,
        unknown: 0,
        cancelled: 0,
        requestId,
      },
      { status: 200, headers: { ...PRIVATE_HEADERS } },
    );
  }

  let maxBatch = WHATSAPP_OUTBOUND_BATCH_DEFAULT;
  try {
    const body = (await request.json()) as { maxBatch?: unknown };
    if (typeof body?.maxBatch === "number" && Number.isFinite(body.maxBatch)) {
      maxBatch = Math.min(
        WHATSAPP_OUTBOUND_BATCH_MAX,
        Math.max(1, Math.floor(body.maxBatch)),
      );
    }
  } catch {
    // empty body ok
  }

  const counts = await processPendingWhatsAppOutbound({ maxBatch });

  return NextResponse.json(
    {
      claimed: counts.claimed,
      sent: counts.sent,
      retry: counts.retry,
      failed: counts.failed,
      unknown: counts.unknown,
      cancelled: counts.cancelled,
      requestId,
    },
    { status: 200, headers: { ...PRIVATE_HEADERS } },
  );
}

export async function GET() {
  return NextResponse.json(
    { code: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST", ...PRIVATE_HEADERS } },
  );
}
