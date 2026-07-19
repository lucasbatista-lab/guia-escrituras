import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/reports/cron-auth";
import {
  generateDailyReportForDate,
  generateYesterdayDailyReport,
} from "@/lib/reports/generate";
import { parseReportDate } from "@/lib/reports/dates";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow enough time for RPC + enrichment on larger days. */
export const maxDuration = 60;

async function handleCron(request: Request): Promise<NextResponse> {
  const requestId = createRequestId();
  const headers = { "Cache-Control": "no-store" };

  try {
    assertCronAuthorized(request);

    const url = new URL(request.url);
    const dateParam = parseReportDate(url.searchParams.get("date"));
    const result = dateParam
      ? await generateDailyReportForDate(dateParam)
      : await generateYesterdayDailyReport();

    logger.info("cron_daily_report", {
      requestId,
      route: "/api/cron/daily-report",
      date: result.date,
      outcome: result.outcome,
      errorCode: result.errorCode ?? null,
    });

    const status = result.outcome === "failed" ? 500 : 200;
    return NextResponse.json(
      {
        ok: result.outcome !== "failed",
        requestId,
        date: result.date,
        outcome: result.outcome,
        ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      },
      { status, headers },
    );
  } catch (error) {
    const client = toClientError(error);
    logger.error("cron_daily_report_denied", {
      requestId,
      route: "/api/cron/daily-report",
      code: client.code,
      status: client.status,
    });
    return NextResponse.json(
      { ok: false, code: client.code, message: client.message, requestId },
      { status: client.status, headers },
    );
  }
}

/** Vercel Cron uses GET with Authorization: Bearer CRON_SECRET. */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
