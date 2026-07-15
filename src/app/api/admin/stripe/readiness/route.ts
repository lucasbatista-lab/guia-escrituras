import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { evaluateStripeReadiness } from "@/lib/stripe/readiness";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

/**
 * Admin-only Stripe cutover readiness.
 * Never exposes secrets or full price/customer IDs.
 */
export async function GET() {
  const requestId = createRequestId();

  try {
    await requireAdminUser();
    const report = await evaluateStripeReadiness();
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const client = toClientError(error);
    logger.warn("stripe_readiness_denied_or_failed", {
      requestId,
      code: client.code,
      status: client.status,
    });
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      {
        status: client.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
