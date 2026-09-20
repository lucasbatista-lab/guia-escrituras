import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import {
  brtCalendarDate,
  getDailyContentForDate,
  isIsoCalendarDate,
  listRecentCalendarDates,
  PRODUCT_TIMEZONE,
} from "@/lib/daily";
import {
  loadDailyInteraction,
  loadDailyInteractionsForDates,
} from "@/lib/daily/interactions";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) {
      return NextResponse.json(
        { code: "unauthorized", message: "Faça login para continuar.", requestId },
        { status: 401, headers: NO_STORE },
      );
    }

    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const today = brtCalendarDate();
    const date =
      dateParam && isIsoCalendarDate(dateParam) ? dateParam : today;
    const history = url.searchParams.get("history") === "1";

    const content = getDailyContentForDate(date);
    const interaction = await loadDailyInteraction(auth.userId, date);

    if (!history) {
      return NextResponse.json(
        {
          date,
          timezone: PRODUCT_TIMEZONE,
          content,
          interaction,
          requestId,
        },
        { headers: NO_STORE },
      );
    }

    const dates = listRecentCalendarDates(today, 7);
    const interactions = await loadDailyInteractionsForDates(auth.userId, dates);
    const byDate = new Map(interactions.map((row) => [row.localDate, row]));

    return NextResponse.json(
      {
        date,
        timezone: PRODUCT_TIMEZONE,
        content,
        interaction,
        history: dates.map((iso) => ({
          date: iso,
          content: getDailyContentForDate(iso),
          interaction: byDate.get(iso) ?? null,
        })),
        requestId,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: NO_STORE },
    );
  }
}
