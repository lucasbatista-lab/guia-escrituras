import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/safety";
import { logger } from "@/lib/logging/logger";
import {
  isFutureUtcDate,
  parseReportDate,
  yesterdayUtcDate,
} from "@/lib/reports/dates";
import {
  dailyReportService,
  normalizeDailyReportAggregates,
  type DailyReportAggregates,
} from "@/lib/reports/daily-report";
import { enrichDailyReportAggregates } from "@/lib/reports/enrich";

export type GenerateDailyReportOutcome =
  | "created"
  | "updated"
  | "unchanged"
  | "failed";

export type GenerateDailyReportResult = {
  date: string;
  outcome: GenerateDailyReportOutcome;
  errorCode?: string;
};

function asSqlAggregates(
  data: unknown,
  date: string,
): Partial<DailyReportAggregates> & { date: string } {
  if (!data || typeof data !== "object") {
    return { date };
  }
  const row = data as Record<string, unknown>;
  return {
    date: typeof row.date === "string" ? row.date : date,
    activeSubscribers: Number(row.activeSubscribers ?? 0),
    revenueBrlCents:
      row.revenueBrlCents === undefined
        ? null
        : (row.revenueBrlCents as number | null),
    activeUsers: Number(row.activeUsers ?? 0),
    totalRequests: Number(row.totalRequests ?? 0),
    totalInputTokens: Number(row.totalInputTokens ?? 0),
    totalOutputTokens: Number(row.totalOutputTokens ?? 0),
    aiCostUsdMicros: Number(row.aiCostUsdMicros ?? 0),
    aiCostBrlCents: Number(row.aiCostBrlCents ?? 0),
    errorCount: Number(row.errorCount ?? 0),
  };
}

/**
 * Compute + upsert a daily report for a UTC calendar date.
 * Idempotent on report_date UNIQUE. Service-role client required.
 */
export async function generateDailyReportForDate(
  dateInput: string,
  options: { now?: Date; force?: boolean } = {},
): Promise<GenerateDailyReportResult> {
  const date = parseReportDate(dateInput);
  if (!date) {
    return {
      date: dateInput,
      outcome: "failed",
      errorCode: "invalid_date",
    };
  }
  if (isFutureUtcDate(date, options.now ?? new Date())) {
    return { date, outcome: "failed", errorCode: "future_date" };
  }

  let client;
  try {
    client = createAdminClient();
  } catch {
    return { date, outcome: "failed", errorCode: "admin_client_unavailable" };
  }

  try {
    const existing = await client
      .from("daily_reports")
      .select("report_date, aggregates")
      .eq("report_date", date)
      .maybeSingle();

    const { data: rpcData, error: rpcError } = await client.rpc(
      "compute_daily_report_aggregates",
      { p_date: date },
    );

    if (rpcError) {
      logger.error("daily_report_rpc_failed", {
        date,
        failureType: "rpc",
        err: rpcError.message,
      });
      return { date, outcome: "failed", errorCode: "rpc_failed" };
    }

    const enriched = await enrichDailyReportAggregates(
      client,
      asSqlAggregates(rpcData, date),
    );
    const interpretation = dailyReportService.interpretWithRules(enriched);

    if (existing.data && !options.force) {
      const prev = normalizeDailyReportAggregates(
        existing.data.aggregates as DailyReportAggregates,
      );
      // Cheap equality: same core request/cost counters → treat as unchanged
      // when force is false and we still refresh interpretation below? Spec wants
      // idempotent upsert — always write to keep enrichment fresh, but report
      // outcome as updated vs created. For true unchanged, compare totals.
      if (
        prev.totalRequests === enriched.totalRequests &&
        prev.aiCostBrlCents === enriched.aiCostBrlCents &&
        prev.activeUsers === enriched.activeUsers &&
        prev.errorCount === enriched.errorCount &&
        prev.newUsers === enriched.newUsers &&
        prev.deepRequests === enriched.deepRequests
      ) {
        await client
          .from("daily_reports")
          .update({
            aggregates: enriched,
            interpretation,
          })
          .eq("report_date", date);
        return { date, outcome: "unchanged" };
      }
    }

    const { error: upsertError } = await client.from("daily_reports").upsert(
      {
        report_date: date,
        aggregates: enriched,
        interpretation,
      },
      { onConflict: "report_date" },
    );

    if (upsertError) {
      logger.error("daily_report_upsert_failed", {
        date,
        failureType: "upsert",
        err: upsertError.message,
      });
      return { date, outcome: "failed", errorCode: "upsert_failed" };
    }

    const outcome: GenerateDailyReportOutcome = existing.data
      ? "updated"
      : "created";
    logger.info("daily_report_generated", {
      date,
      outcome,
      totalRequests: enriched.totalRequests,
      activeUsers: enriched.activeUsers,
    });
    return { date, outcome };
  } catch (error) {
    logger.error("daily_report_generate_failed", {
      date,
      failureType: "unexpected",
      err: error instanceof Error ? error.message : "unknown",
    });
    if (error instanceof AppError) {
      return { date, outcome: "failed", errorCode: error.code };
    }
    return { date, outcome: "failed", errorCode: "generate_failed" };
  }
}

export async function generateYesterdayDailyReport(
  now = new Date(),
): Promise<GenerateDailyReportResult> {
  return generateDailyReportForDate(yesterdayUtcDate(now), { now });
}

export async function generateDailyReportRange(
  dates: string[],
  options: { now?: Date; force?: boolean } = {},
): Promise<GenerateDailyReportResult[]> {
  const results: GenerateDailyReportResult[] = [];
  for (const date of dates) {
    results.push(await generateDailyReportForDate(date, options));
  }
  return results;
}
