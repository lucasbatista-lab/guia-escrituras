import { NextResponse } from "next/server";
import { getStoredDailyReports } from "@/lib/admin/metrics";
import { dailyReportService } from "@/lib/reports";
import { requireAdminUser } from "@/lib/auth";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export async function GET() {
  const requestId = createRequestId();

  try {
    await requireAdminUser();
    const reports = await getStoredDailyReports(1);
    const latest = reports[0];

    const headers = { "Cache-Control": "no-store" };

    if (!latest) {
      return NextResponse.json(
        {
          requestId,
          aggregates: null,
          interpretation: null,
          note: "Nenhum relatório gerado.",
        },
        { headers },
      );
    }

    const interpretation = dailyReportService.interpretWithRules(
      latest.aggregates,
    );

    return NextResponse.json(
      {
        requestId,
        aggregates: latest.aggregates,
        interpretation,
        reportDate: latest.reportDate,
      },
      { headers },
    );
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      {
        status: client.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
