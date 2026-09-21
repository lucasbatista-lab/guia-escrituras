import Link from "next/link";
import type { DailyContent, UserDailyInteraction } from "@/lib/daily";
import { cn } from "@/lib/utils";

export function DailyHistoryStrip({
  items,
  selectedDate,
  today,
}: {
  items: Array<{
    date: string;
    label: string;
    content: DailyContent;
    interaction: UserDailyInteraction | null;
  }>;
  selectedDate?: string;
  today: string;
}) {
  return (
    <section aria-labelledby="daily-history-heading" className="relative z-10">
      <h2
        id="daily-history-heading"
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
      >
        Últimos dias
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Reveja o editorial de um dia — sem cobrança por ausência.
      </p>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const done = Boolean(
            item.interaction?.completedAt || item.interaction?.checkin,
          );
          const isToday = item.date === today;
          const selected = item.date === (selectedDate ?? today);
          const href = isToday ? "/hoje" : `/hoje?dia=${item.date}`;
          return (
            <li key={item.date} className="shrink-0">
              <Link
                href={href}
                aria-current={selected ? "page" : undefined}
                aria-label={`${item.label}. ${item.content.title}.${done ? " Feito." : ""}`}
                title={item.content.title}
                className={cn(
                  "flex min-h-11 min-w-[4.75rem] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-wine/45 bg-wine/[0.1]"
                    : done
                      ? "border-wine/25 bg-wine/[0.05]"
                      : "border-border/70 bg-card/70",
                )}
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                  {isToday ? "Hoje" : item.label}
                </span>
                <span className="mt-1 text-xs font-medium text-ink">
                  {done ? "feito" : "—"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
