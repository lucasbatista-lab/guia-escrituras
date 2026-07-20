import { NextResponse } from "next/server";
import {
  buildUserDataExport,
  serializeUserDataExport,
} from "@/lib/account/export-user-data";
import { getAuthUserContext } from "@/lib/auth";
import { maskUserId } from "@/lib/logging/mask";
import { logger } from "@/lib/logging/logger";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";

const PRIVATE_DOWNLOAD_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

function methodNotAllowed() {
  return NextResponse.json(
    {
      code: "method_not_allowed",
      message: "Use GET para baixar seus dados.",
    },
    {
      status: 405,
      headers: {
        Allow: "GET",
        ...PRIVATE_DOWNLOAD_HEADERS,
      },
    },
  );
}

/**
 * Owner self-service data export.
 * userId is resolved exclusively from the authenticated session.
 * Query/body/header user identifiers from the client are ignored.
 */
export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  // Explicitly ignore any client-supplied identity parameters.
  void new URL(request.url).searchParams.get("userId");
  void request.headers.get("x-user-id");

  try {
    const auth = await getAuthUserContext();
    if (!auth) {
      logger.info("user_data_export_requested", {
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
        { status: 401, headers: { ...PRIVATE_DOWNLOAD_HEADERS } },
      );
    }

    const { document, filename } = await buildUserDataExport({
      userId: auth.userId,
      email: auth.email,
    });
    const body = serializeUserDataExport(document);
    const byteLength = Buffer.byteLength(body, "utf8");

    logger.info("user_data_export_requested", {
      requestId,
      outcome: "success",
      userId: maskUserId(auth.userId),
      durationMs: Date.now() - startedAt,
      approximateBytes: byteLength,
      conversationCount: document.conversations.length,
      // Never log export content.
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        ...PRIVATE_DOWNLOAD_HEADERS,
      },
    });
  } catch (error) {
    const client = toClientError(error);
    logger.warn("user_data_export_requested", {
      requestId,
      outcome: "failure",
      code: client.code,
      status: client.status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      {
        status: client.status,
        headers: { ...PRIVATE_DOWNLOAD_HEADERS },
      },
    );
  }
}

export async function POST() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}
