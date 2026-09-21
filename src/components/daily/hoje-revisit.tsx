import Link from "next/link";
import { AppScreenHeader } from "@/components/platform/app-screen-header";
import { Button } from "@/components/ui/button";
import type { DailyContent, UserDailyInteraction } from "@/lib/daily";

/** Read-only past-day editorial — never writes interaction as "today". */
export function HojeRevisit({
  date,
  dateLabel,
  content,
  interaction,
}: {
  date: string;
  dateLabel: string;
  content: DailyContent;
  interaction: UserDailyInteraction | null;
}) {
  const done = Boolean(interaction?.completedAt);
  return (
    <section
      aria-labelledby="hoje-revisit-heading"
      className="relative z-10 space-y-5"
      data-hoje-phase="revisit"
      data-hoje-date={date}
    >
      <AppScreenHeader
        eyebrow="Revisitar"
        title="Presença"
        subtitle={dateLabel}
        status={
          <p className="text-xs text-ink-soft">
            {done ? "Você esteve presente neste dia." : "Editorial do dia — só leitura."}
          </p>
        }
      />
      <div className="amem-surface-scene px-5 py-6">
        <div className="relative z-10 space-y-4">
          <h2
            id="hoje-revisit-heading"
            className="font-display text-[22px] font-semibold leading-snug text-ink"
          >
            {content.title}
          </h2>
          <p className="text-sm text-ink-soft">{content.scriptureReference}</p>
          <p className="text-[15px] leading-relaxed text-ink">{content.paraphrase}</p>
          <p className="font-display text-base italic leading-snug text-ink">
            “{content.prayer.replace(/^"|"$/g, "")}”
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">{content.action}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild variant="ritual" className="min-h-11 w-full">
          <Link href="/hoje">Voltar ao Hoje</Link>
        </Button>
        <p className="text-center text-xs text-ink-soft">
          Isto não altera o dia de hoje nem o que você salvou.
        </p>
      </div>
    </section>
  );
}
