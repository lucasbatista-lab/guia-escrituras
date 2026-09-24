import { NextResponse } from "next/server";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  deleteAuthenticatedAccount,
  type AccountDeleteErrorCode,
} from "@/lib/account/delete-account";
import { getAuthUserContext } from "@/lib/auth";
import { maskUserId } from "@/lib/logging/mask";
import { logger } from "@/lib/logging/logger";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function methodNotAllowed() {
  return NextResponse.json(
    {
      code: "method_not_allowed",
      message: "Use POST para excluir sua conta.",
    },
    {
      status: 405,
      headers: { Allow: "POST", ...PRIVATE_HEADERS },
    },
  );
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

function statusForCode(code: AccountDeleteErrorCode): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "forbidden":
    case "demo_mode_forbidden":
      return 403;
    case "confirmation_required":
      return 400;
    case "subscription_cancel_failed":
      return 409;
    case "deletion_failed":
      return 500;
    default:
      return 500;
  }
}

/**
 * Self-service account deletion.
 * Identity is resolved exclusively from the authenticated session.
 * Client-supplied userId / email / profile_id are ignored.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    if (!isSameOriginRequest(request)) {
      logger.warn("account_delete_cross_origin_blocked", { requestId });
      return NextResponse.json(
        {
          code: "forbidden",
          message: "Origem inválida.",
          requestId,
        },
        { status: 403, headers: { ...PRIVATE_HEADERS } },
      );
    }

    const auth = await getAuthUserContext();
    if (!auth) {
      logger.info("account_delete_requested", {
        requestId,
        outcome: "unauthenticated",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          code: "unauthenticated",
          message: "Faça login para continuar.",
          requestId,
        },
        { status: 401, headers: { ...PRIVATE_HEADERS } },
      );
    }

    if (auth.demoMode) {
      return NextResponse.json(
        {
          code: "demo_mode_forbidden",
          message: "Exclusão de conta não está disponível neste modo.",
          requestId,
        },
        { status: 403, headers: { ...PRIVATE_HEADERS } },
      );
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const record =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};

    // Explicitly ignore any client-supplied identity — session is authority.
    void record.userId;
    void record.user_id;
    void record.email;
    void record.profile_id;
    void record.profileId;
    void request.headers.get("x-user-id");

    const confirmation =
      typeof record.confirmation === "string" ? record.confirmation : "";

    const result = await deleteAuthenticatedAccount({
      userId: auth.userId,
      confirmation,
      requestId,
    });

    if (!result.ok) {
      logger.info("account_delete_requested", {
        requestId,
        outcome: "failure",
        code: result.code,
        userId: maskUserId(auth.userId),
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          code: result.code,
          message: result.message,
          requestId: result.requestId,
        },
        {
          status: statusForCode(result.code),
          headers: { ...PRIVATE_HEADERS },
        },
      );
    }

    logger.info("account_delete_requested", {
      requestId,
      outcome: "success",
      userId: maskUserId(auth.userId),
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { ok: true, requestId: result.requestId },
      { status: 200, headers: { ...PRIVATE_HEADERS } },
    );
  } catch (error) {
    logger.error("account_delete_route_failed", {
      requestId,
      err: error instanceof Error ? error.message : "unknown",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        code: "deletion_failed",
        message:
          "Não foi possível excluir a conta agora. Tente novamente em instantes.",
        requestId,
      },
      { status: 500, headers: { ...PRIVATE_HEADERS } },
    );
  }
}

export async function GET() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  // Prefer explicit POST + confirmation body over DELETE without body.
  return methodNotAllowed();
}

export { ACCOUNT_DELETE_CONFIRMATION };
