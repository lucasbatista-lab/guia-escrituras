import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  DAILY_REPORT_BACKFILL_MAX_DAYS,
  enumerateUtcDatesInclusive,
  isFutureUtcDate,
  parseReportDate,
  todayUtcDate,
} from "@/lib/reports/dates";
import { generateDailyReportRange } from "@/lib/reports/generate";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  date?: string;
  from?: string;
  to?: string;
  force?: boolean;
  confirm?: boolean;
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  const headers = { "Cache-Control": "no-store" };

  try {
    const auth = await requireAdminUser();
    const json = (await request.json().catch(() => null)) as Body | null;
    if (!json || typeof json !== "object") {
      return NextResponse.json(
        {
          code: "validation_error",
          message: "Informe date ou from/to.",
          requestId,
        },
        { status: 400, headers },
      );
    }

    const force = Boolean(json.force);
    let dates: string[] = [];

    if (json.date) {
      const date = parseReportDate(json.date);
      if (!date) {
        return NextResponse.json(
          {
            code: "invalid_date",
            message: "Data inválida. Use YYYY-MM-DD.",
            requestId,
          },
          { status: 400, headers },
        );
      }
      if (isFutureUtcDate(date)) {
        return NextResponse.json(
          {
            code: "future_date",
            message: "Não é possível gerar relatório para datas futuras.",
            requestId,
          },
          { status: 400, headers },
        );
      }
      if (date === todayUtcDate()) {
        return NextResponse.json(
          {
            code: "incomplete_day",
            message:
              "O dia UTC atual ainda não terminou. Gere o dia anterior ou aguarde a virada.",
            requestId,
          },
          { status: 400, headers },
        );
      }
      dates = [date];
    } else if (json.from && json.to) {
      if (!json.confirm) {
        return NextResponse.json(
          {
            code: "confirmation_required",
            message:
              "Confirme o backfill enviando confirm: true (máx. 31 dias).",
            requestId,
          },
          { status: 400, headers },
        );
      }
      const ranged = enumerateUtcDatesInclusive(
        json.from,
        json.to,
        DAILY_REPORT_BACKFILL_MAX_DAYS,
      );
      if (!ranged.ok) {
        return NextResponse.json(
          {
            code: ranged.code,
            message: ranged.message,
            requestId,
          },
          { status: 400, headers },
        );
      }
      const filtered = ranged.dates.filter(
        (d) => !isFutureUtcDate(d) && d !== todayUtcDate(),
      );
      if (filtered.length === 0) {
        return NextResponse.json(
          {
            code: "empty_range",
            message: "Nenhuma data completa no intervalo solicitado.",
            requestId,
          },
          { status: 400, headers },
        );
      }
      dates = filtered;
    } else {
      return NextResponse.json(
        {
          code: "validation_error",
          message: "Informe date ou from/to.",
          requestId,
        },
        { status: 400, headers },
      );
    }

    const results = await generateDailyReportRange(dates, { force });
    const failed = results.filter((r) => r.outcome === "failed").length;

    logger.info("admin_daily_report_generate", {
      requestId,
      userId: maskUserId(auth.userId),
      dates: results.length,
      failed,
      force,
    });

    return NextResponse.json(
      {
        requestId,
        results,
        summary: {
          total: results.length,
          failed,
          maxDays: DAILY_REPORT_BACKFILL_MAX_DAYS,
        },
      },
      { status: failed === results.length ? 500 : 200, headers },
    );
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers },
    );
  }
}
