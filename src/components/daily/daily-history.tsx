import Link from "next/link";
import type { DailyContent, UserDailyInteraction } from "@/lib/daily";

export function DailyHistoryStrip({
  items,
}: {
  items: Array<{
    date: string;
    label: string;
    content: DailyContent;
    interaction: UserDailyInteraction | null;
  }>;
}) {
  return (
    <section aria-labelledby="daily-history-heading">
      <h2 id="daily-history-heading" className="font-display text-lg text-ink">
        Últimos 7 dias
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Um registro discreto dos dias em que você passou por aqui.
      </p>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const done = Boolean(item.interaction?.completedAt || item.interaction?.checkin);
          const saved = Boolean(item.interaction?.savedAt);
          return (
            <li key={item.date} className="shrink-0">
              <span
                className={`flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center ${
                  done
                    ? "border-wine/30 bg-wine/[0.06]"
                    : "border-border/70 bg-card/70"
                }`}
                title={item.content.title}
              >
                <span className="text-[0.65rem] uppercase tracking-wide text-ink-soft">
                  {item.label}
                </span>
                <span className="mt-1 text-xs font-medium text-ink">
                  {done ? (saved ? "salvo" : "feito") : "—"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-ink-soft">
        <Link href="/inicio" className="underline-offset-4 hover:underline">
          O conteúdo de cada dia vive nesta página
        </Link>
        . Sem ranking e sem cobrança por ausência.
      </p>
    </section>
  );
}
