import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import {
  logPlanConversionEvent,
  type PlanConversionEventName,
} from "@/lib/marketing/plan-conversion-events";
import type { PlanKey } from "@/lib/entitlements";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set<PlanConversionEventName>([
  "plan_comparison_viewed",
  "deep_upsell_viewed",
  "usage_limit_upsell_viewed",
  "upgrade_interest_clicked",
]);

const PLAN_KEYS = new Set<PlanKey>([
  "essencial",
  "caminho",
  "profundo",
  "particular",
]);

/**
 * Records aggregated upgrade-interest signals — no conversation content.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as {
      event?: string;
      targetPlanKey?: string;
      origin?: string;
    };
    const event = body.event as PlanConversionEventName;
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json(
        { code: "invalid_event", message: "Evento inválido.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const targetPlanKey =
      body.targetPlanKey && PLAN_KEYS.has(body.targetPlanKey as PlanKey)
        ? (body.targetPlanKey as PlanKey)
        : null;

    const auth = await getAuthUserContext();

    logPlanConversionEvent({
      event,
      userId: auth?.userId ?? null,
      currentPlanKey: auth?.planKey ?? null,
      targetPlanKey,
      origin: body.origin,
      outcome: "success",
    });

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { code: "method_not_allowed", message: "Use POST." },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
