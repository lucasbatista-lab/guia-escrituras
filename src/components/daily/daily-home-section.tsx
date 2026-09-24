import { getCanonicalSiteUrl } from "@/lib/auth/app-url";
import { DailyHistoryStrip } from "@/components/daily/daily-history";
import { HojeRitual } from "@/components/daily/hoje-ritual";
import { HojeRevisit } from "@/components/daily/hoje-revisit";
import {
  brtCalendarDate,
  buildDailyShareUrl,
  formatBrtLongDate,
  getDailyContentForDate,
  isIsoCalendarDate,
  isPastCalendarDate,
  listRecentCalendarDates,
} from "@/lib/daily";
import {
  loadDailyInteraction,
  loadDailyInteractionsForDates,
} from "@/lib/daily/interactions";

export async function DailyHomeSection({
  userId,
  allowsChat,
  revisitDate = null,
}: {
  userId: string;
  allowsChat: boolean;
  /** Past calendar day to reopen editorially — never treated as today. */
  revisitDate?: string | null;
}) {
  const today = brtCalendarDate();
  // Authenticated revisit: only a valid past civil day (never future, never today-as-query).
  const safeRevisit =
    revisitDate &&
    isIsoCalendarDate(revisitDate) &&
    isPastCalendarDate(revisitDate)
      ? revisitDate
      : null;

  const dates = listRecentCalendarDates(today, 7);
  const historyRows = await loadDailyInteractionsForDates(userId, dates);
  const byDate = new Map(historyRows.map((row) => [row.localDate, row]));

  const history = (
    <DailyHistoryStrip
      today={today}
      selectedDate={safeRevisit ?? today}
      items={dates.map((iso) => ({
        date: iso,
        label: formatHistoryLabel(iso),
        content: getDailyContentForDate(iso),
        interaction: byDate.get(iso) ?? null,
      }))}
    />
  );

  if (safeRevisit) {
    const content = getDailyContentForDate(safeRevisit);
    const interaction = byDate.get(safeRevisit) ?? null;
    return (
      <div className="space-y-6">
        <HojeRevisit
          date={safeRevisit}
          dateLabel={formatBrtLongDate(safeRevisit)}
          content={content}
          interaction={interaction}
        />
        {history}
      </div>
    );
  }

  const content = getDailyContentForDate(today);
  const interaction = await loadDailyInteraction(userId, today);
  const shareUrl = buildDailyShareUrl(today, getCanonicalSiteUrl());

  return (
    <div className="space-y-6">
      <HojeRitual
        date={today}
        dateLabel={formatBrtLongDate(today)}
        content={content}
        initialInteraction={interaction}
        allowsChat={allowsChat}
        shareUrl={shareUrl}
      />
      {history}
    </div>
  );
}

function formatHistoryLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
  }).format(utc);
}
