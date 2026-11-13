import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getWhatsAppWorkerSecret,
  isWhatsAppChannelEnabled,
} from "@/lib/whatsapp/config";
import { processAvailableWhatsAppBundles } from "@/lib/whatsapp/process-bundles";
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
  const header = request.headers.get("x-whatsapp-worker-secret");
  if (header?.trim()) return header.trim();
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * Internal durable worker entry — not scheduled in this block.
 * Requires WHATSAPP_WORKER_SECRET. Never accepts secrets via query string.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const expected = getWhatsAppWorkerSecret();
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

  if (!isWhatsAppChannelEnabled()) {
    logWhatsAppOps("worker_disabled");
    return NextResponse.json(
      { code: "channel_disabled", processed: 0, requestId },
      { status: 200, headers: { ...PRIVATE_HEADERS } },
    );
  }

  let maxBundles = 5;
  try {
    const body = (await request.json()) as { maxBundles?: unknown };
    if (
      typeof body?.maxBundles === "number" &&
      Number.isFinite(body.maxBundles)
    ) {
      maxBundles = Math.min(20, Math.max(1, Math.floor(body.maxBundles)));
    }
  } catch {
    // empty body is fine
  }

  const result = await processAvailableWhatsAppBundles({ maxBundles });

  return NextResponse.json(
    {
      processed: result.processed,
      outcomes: result.outcomes,
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
