import { NextResponse } from "next/server";
import { dailyReportService } from "@/lib/reports";
import type { DailyReportAggregates } from "@/lib/reports";
import { requireAdminUser } from "@/lib/auth";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export async function GET() {
  const requestId = createRequestId();

  try {
    await requireAdminUser();

    const aggregates: DailyReportAggregates = {
      date: new Date().toISOString().slice(0, 10),
      activeSubscribers: 241,
      revenueBrlCents: 482000,
      activeUsers: 174,
      totalRequests: 3120,
      totalInputTokens: 4_200_000,
      totalOutputTokens: 1_800_000,
      aiCostUsdMicros: 7_500_000,
      aiCostBrlCents: 41200,
      usageP50: 12,
      usageP90: 41,
      usageP99: 96,
      errorCount: 18,
      retentionD1: 0.62,
      retentionD7: 0.41,
      retentionD30: 0.28,
      conversionsByOrigin: [{ origin: "organic", count: 18 }],
      partnerPerformance: [
        { partnerCode: "PARCEIRO_A", attributions: 20, conversions: 14 },
      ],
      anomalies: [{ signal: "burst_diario", count: 2 }],
    };

    const interpretation = dailyReportService.interpretWithRules(aggregates);

    return NextResponse.json({
      requestId,
      aggregates,
      interpretation,
      note: "Agregados mock nesta fatia até o cron SQL estar ligado.",
    });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status },
    );
  }
}
