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
 */
export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const filters = parseAdminUserListSearchParams(params);
    const { csv, rowCount, truncated, filename } =
      await exportAdminUsersCsv(filters);

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
