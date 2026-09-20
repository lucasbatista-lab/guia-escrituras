import { getCanonicalSiteUrl } from "@/lib/auth/app-url";
import { DailyHistoryStrip } from "@/components/daily/daily-history";
import { HojeRitual } from "@/components/daily/hoje-ritual";
import {
  brtCalendarDate,
  buildDailyShareUrl,
  formatBrtLongDate,
  getDailyContentForDate,
  listRecentCalendarDates,
} from "@/lib/daily";
import { loadDailyInteraction, loadDailyInteractionsForDates } from "@/lib/daily/interactions";

export async function DailyHomeSection({
  userId,
  allowsChat: _allowsChat,
}: {
  userId: string;
  allowsChat: boolean;
}) {
  const today = brtCalendarDate();
  const content = getDailyContentForDate(today);
  const interaction = await loadDailyInteraction(userId, today);
  const dates = listRecentCalendarDates(today, 7);
  const historyRows = await loadDailyInteractionsForDates(userId, dates);
  const byDate = new Map(historyRows.map((row) => [row.localDate, row]));
  const shareUrl = buildDailyShareUrl(today, getCanonicalSiteUrl());

  return (
    <div className="space-y-6">
      <HojeRitual
        date={today}
        dateLabel={formatBrtLongDate(today)}
        content={content}
        initialInteraction={interaction}
        shareUrl={shareUrl}
      />
      <DailyHistoryStrip
        items={dates.map((iso) => ({
          date: iso,
          label: formatHistoryLabel(iso),
          content: getDailyContentForDate(iso),
          interaction: byDate.get(iso) ?? null,
        }))}
      />
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
