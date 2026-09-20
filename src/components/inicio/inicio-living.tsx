import Link from "next/link";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { Button } from "@/components/ui/button";
import { PlanChip } from "@/components/inicio/plan-chip";
import { InicioCheckinStrip } from "@/components/inicio/inicio-checkin-strip";
import {
  MemoryStrip,
  loadRecentMemory,
} from "@/components/inicio/memory-strip";
import {
  brtCalendarDate,
  formatBrtLongDate,
  getDailyContentForDate,
} from "@/lib/daily";
import { loadDailyInteraction } from "@/lib/daily/interactions";

function shortDateLabel(iso: string): string {
  try {
    const d = new Date(`${iso}T12:00:00-03:00`);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
    })
      .format(d)
      .replace(".", "");
  } catch {
    return iso;
  }
}

export async function InicioLiving({
  greeting,
  allowsChat,
  userId,
  planLabel,
  journeyTitle,
  journeySubtitle,
  journeyHref,
  chatTitle,
  chatHref,
  chatPreview,
}: {
  greeting: string;
  allowsChat: boolean;
  userId: string;
  planLabel?: string | null;
  journeyTitle?: string | null;
  journeySubtitle?: string | null;
  journeyHref?: string | null;
  chatTitle?: string | null;
  chatHref?: string | null;
  chatPreview?: string | null;
}) {
  const today = brtCalendarDate();
  const content = getDailyContentForDate(today);
  const interaction = await loadDailyInteraction(userId, today);
  const memory = await loadRecentMemory(userId);
  const completed = Boolean(interaction?.completedAt);
  const checkin = interaction?.checkin ?? null;
  const dateShort = shortDateLabel(today);
  const dateLabel = formatBrtLongDate(today);
  void greeting;
  void dateLabel;

  const yesterdayCarry =
    memory[0]?.snip ??
    (content.prayer ? content.prayer.replace(/^"|"$/g, "") : null);

  return (
    <div className="relative space-y-5 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <header className="relative z-10 flex items-end justify-between gap-3">
        <h1 className="font-sans text-[30px] font-bold tracking-[-0.035em] text-ink">
          Início
        </h1>
        {allowsChat ? (
          <PlanChip variant="paid" label={planLabel ?? "Caminho"} />
        ) : (
          <PlanChip variant="free" label="Grátis" />
        )}
      </header>

      <section
        className="amem-surface-dusk relative z-10 mx-0 px-5 py-6"
        aria-labelledby="inicio-hoje-heading"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
          {completed || allowsChat
            ? completed
              ? `Presença · ${dateShort}`
              : `Continuar · Hoje`
            : `Hoje · ${dateShort}`}
        </p>
        <h2
          id="inicio-hoje-heading"
          className="mt-2.5 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#FFF9F0]"
        >
          {completed
            ? "Você esteve presente"
            : allowsChat && !completed
              ? "Escuto · passo 2"
              : content.title}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#FFFDFC]/70">
          {completed
            ? "Ritual concluído · sem cartão"
            : allowsChat && !completed
              ? "Retome de onde parou · ~2 min"
              : "Ritual livre · ~4 min · sem cartão"}
        </p>
      </section>

      <div className="relative z-10">
        <Button asChild variant="ritual" className="min-h-[52px] w-full text-[15px] font-bold">
          <Link href="/hoje">
            {completed
              ? "Revisitar ritual"
              : allowsChat
                ? "Retomar Hoje"
                : "Entrar no Hoje"}
          </Link>
        </Button>
      </div>

      {yesterdayCarry ? (
        <div className="amem-surface-poco relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
            Ontem você levou
          </p>
          <p className="mt-2 pl-1 text-sm leading-relaxed text-ink-soft">
            “{yesterdayCarry.replace(/^"|"$/g, "")}”
            {memory[0] ? null : ` · ${content.scriptureReference}`}
          </p>
        </div>
      ) : null}

      {!completed ? (
        <div className="relative z-10">
          <InicioCheckinStrip date={today} initialCheckin={checkin} />
        </div>
      ) : null}

      <div className="relative z-10 flex items-stretch gap-2.5">
        <Link
          href="/espaco"
          className="amem-folha flex-1 -rotate-[0.6deg] px-3.5 pb-[18px] pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className="block h-[2.5px] w-[22px] rounded-sm bg-[linear-gradient(90deg,var(--amem-wine-deep),var(--amem-brass))]"
          />
          <p className="mt-2.5 text-sm font-bold tracking-[-0.01em] text-ink">
            Espaço
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[color:var(--amem-mute)]">
            {memory.length > 0
              ? allowsChat
                ? `Linha viva · ${memory.length} marcas`
                : `${memory.length} memórias vivas`
              : "Ainda em branco"}
          </p>
        </Link>
        <Link
          href={journeyHref ?? "/jornadas"}
          className="mt-2.5 flex-1 rotate-[0.7deg] rounded-[18px] px-3.5 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            background: "rgba(235,231,225,0.82)",
            boxShadow: "inset 0 0 0 1px var(--amem-hairline)",
          }}
        >
          <span
            aria-hidden
            className="block h-0.5 w-3.5 rounded-sm opacity-75"
            style={{
              background:
                "linear-gradient(90deg, var(--amem-plum), rgba(184,150,90,0.45))",
            }}
          />
          <p className="mt-2.5 text-[13px] font-semibold tracking-[-0.01em] text-ink-soft">
            {allowsChat && journeyTitle ? "Jornada" : "Caminhos"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[color:var(--amem-mute)]">
            {allowsChat
              ? (journeySubtitle ??
                journeyTitle ??
                "Continue no seu ritmo")
              : "Prévia · plano Caminho"}
          </p>
        </Link>
      </div>

      {allowsChat ? (
        <Link
          href={chatHref ?? "/conversar"}
          className="amem-folha relative z-10 block px-[18px] py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
            Conversar · Essencial
          </p>
          <p className="mt-2 font-display text-[17px] italic leading-snug text-ink">
            {chatPreview
              ? chatPreview
              : (chatTitle ?? "como orar quando estou seco?")}
          </p>
        </Link>
      ) : (
        <div className="relative z-10">
          <MemoryStrip items={memory} />
        </div>
      )}
    </div>
  );
}
