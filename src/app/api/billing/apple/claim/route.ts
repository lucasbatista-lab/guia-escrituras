import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import { bindVerifiedAppleSubscriptionToUser } from "@/lib/apple/bind";
import { isAppleIapConfigured } from "@/lib/apple/config";
import { verifyAppleSignedTransaction } from "@/lib/apple/notifications";
import { AppleConfigError } from "@/lib/apple/config";
import { getEffectiveAccessForUser } from "@/lib/billing/access";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/**
 * Future StoreKit client posts a verified Apple transaction JWS.
 * Body: { signedTransaction: string }
 * Client-supplied planKey / userId are ignored.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { code: "forbidden", message: "Origem inválida.", requestId },
      { status: 403, headers: HEADERS },
    );
  }

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

  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return NextResponse.json(
      {
        code: "unauthenticated",
        message: "Faça login para continuar.",
        requestId,
      },
      { status: 401, headers: HEADERS },
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

  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  // Ignore client authority fields.
  void record.planKey;
  void record.plan_key;
  void record.userId;
  void record.user_id;
  void record.originalTransactionId;

  const signedTransaction =
    typeof record.signedTransaction === "string"
      ? record.signedTransaction.trim()
      : "";

  if (!signedTransaction) {
    return NextResponse.json(
      {
        code: "signed_transaction_required",
        message: "signedTransaction é obrigatório.",
        requestId,
      },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const verified = await verifyAppleSignedTransaction(signedTransaction);
    const bind = await bindVerifiedAppleSubscriptionToUser({
      authenticatedUserId: auth.userId,
      environment: verified.environment,
      transaction: verified.transaction,
    });

    if (!bind.ok) {
      const status =
        bind.code === "conflict"
          ? 409
          : bind.code === "unknown_product"
            ? 400
            : 400;
      return NextResponse.json(
        { code: bind.code, message: bind.message, requestId },
        { status, headers: HEADERS },
      );
    }

    const access = await getEffectiveAccessForUser(auth.userId, {
      useAdmin: true,
    });

    logger.info("apple_claim_succeeded", {
      requestId,
      userId: maskUserId(auth.userId),
      planKey: bind.planKey,
      accessPlanKey: access.planKey,
      idempotent: bind.idempotent,
    });

    return NextResponse.json(
      {
        ok: true,
        planKey: access.planKey,
        accessSource: access.accessSource,
        requestId,
      },
      { status: 200, headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof AppleConfigError) {
      return NextResponse.json(
        {
          code: "apple_not_configured",
          message: error.message,
          requestId,
        },
        { status: 503, headers: HEADERS },
      );
    }
    logger.warn("apple_claim_verify_failed", {
      requestId,
      userId: maskUserId(auth.userId),
      err: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        code: "verification_failed",
        message: "Transação Apple inválida.",
        requestId,
      },
      { status: 400, headers: HEADERS },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { code: "method_not_allowed", message: "Use POST." },
    { status: 405, headers: { ...HEADERS, Allow: "POST" } },
  );
}
