import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  exportAdminUsersCsv,
  parseAdminUserListSearchParams,
} from "@/lib/admin";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

/**
 * Admin CSV export of the filtered user list.
 * No conversation content, no Stripe secrets, capped rows.
 *
 * POST-only by design: a GET/link-based export is trivially triggered by a
 * prefetch, a shared URL, or an accidental click. Requiring a POST (backed
 * by an explicit UI confirmation) makes exporting PII a deliberate action.
 */
export async function GET() {
  return NextResponse.json(
    {
      code: "method_not_allowed",
      message: "Use POST para exportar (confirmação obrigatória).",
    },
    { status: 405, headers: { "Cache-Control": "no-store", Allow: "POST" } },
  );
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Same-origin browser form/fetch requests either omit Origin (older
  // browsers on same-origin form POSTs) or send an Origin matching the host.
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    if (!isSameOriginRequest(request)) {
      logger.warn("admin_users_csv_cross_origin_blocked", { requestId });
      return NextResponse.json(
        { code: "forbidden", message: "Origem inválida.", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    await requireAdminUser();

    const contentType = request.headers.get("content-type") ?? "";
    const params: Record<string, string> = {};
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") params[key] = value;
      }
    } else {
      const url = new URL(request.url);
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    const filters = parseAdminUserListSearchParams(params);
    const { csv, rowCount, truncated, filename } =
      await exportAdminUsersCsv(filters);

    // Structured log only — never the CSV content, emails, or names.
    logger.info("admin_users_csv_exported", {
      requestId,
      rowCount,
      truncated,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Row-Count": String(rowCount),
        "X-Export-Truncated": truncated ? "1" : "0",
      },
    });
  } catch (error) {
    const client = toClientError(error);
    logger.warn("admin_users_csv_denied_or_failed", {
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
