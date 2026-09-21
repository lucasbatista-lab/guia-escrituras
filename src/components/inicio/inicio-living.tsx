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
import { JourneyCoverArt } from "@/components/journeys/covers/journey-cover-art";
import {
  IconChevron,
  IconJournal,
  IconJourney,
} from "@/components/brand/icons/archive-icons";
import {
  brtCalendarDate,
  formatBrtLongDate,
  getDailyContentForDate,
} from "@/lib/daily";
import { loadDailyInteraction } from "@/lib/daily/interactions";
import { journeyShortPromise } from "@/lib/journeys/display";

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

function slugFromJourneyHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/jornadas\/([^/?#]+)/);
  return m?.[1] ?? null;
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

  const journeySlug = slugFromJourneyHref(journeyHref);
  const hasActiveJourney = Boolean(journeyTitle || journeyHref);

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

      {/* Hoje dominates — hero scene + clear action */}
      <section
        className="amem-surface-dusk relative z-10 mx-0 overflow-hidden px-5 pb-6 pt-6"
        aria-labelledby="inicio-hoje-heading"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(212,188,140,0.28),transparent_68%)]"
        />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
          {completed || allowsChat
            ? completed
              ? `Presença · ${dateShort}`
              : `Continuar · Hoje`
            : `Hoje · ${dateShort}`}
        </p>
        <h2
          id="inicio-hoje-heading"
          className="relative mt-2.5 max-w-[16ch] text-[26px] font-bold leading-[1.12] tracking-[-0.02em] text-[#FFF9F0]"
        >
          {completed
            ? "Você esteve presente"
            : allowsChat && !completed
              ? "Escuto · passo 2"
              : content.title}
        </h2>
        <p className="relative mt-2.5 max-w-[28ch] text-xs leading-relaxed text-[#FFFDFC]/70">
          {completed
            ? "Ritual concluído · sem cartão"
            : allowsChat && !completed
              ? "Retome de onde parou · ~2 min"
              : "Ritual livre · ~4 min · sem cartão"}
        </p>
        <div className="relative mt-5">
          <Button
            asChild
            variant="ritual"
            className="min-h-[52px] w-full bg-[#FFF9F0] text-[15px] font-bold text-[color:var(--amem-wine-deep,#5A2232)] hover:bg-[#FFF9F0]/92"
          >
            <Link href="/hoje" className="inline-flex items-center justify-center gap-2">
              {completed
                ? "Revisitar ritual"
                : allowsChat
                  ? "Retomar Hoje"
                  : "Entrar no Hoje"}
              <IconChevron className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

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

      {/* Active / recommended Caminho — visual continuity, not equal module */}
      <section className="relative z-10" aria-labelledby="inicio-caminho-heading">
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <p
            id="inicio-caminho-heading"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
          >
            Caminhos
          </p>
          <Link
            href="/jornadas"
            className="inline-flex min-h-9 items-center gap-1 text-[11px] font-medium text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver todos
            <IconChevron className="size-3.5" />
          </Link>
        </div>
        <Link
          href={journeyHref ?? "/jornadas"}
          className="amem-cover-frame group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <JourneyCoverArt
            slug={journeySlug ?? "ansiedade-confianca"}
            size="compact"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3.5 pt-10">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F0E6D0]/88">
                <IconJourney className="size-3.5 opacity-90" />
                {allowsChat
                  ? hasActiveJourney
                    ? "Continuar"
                    : "Recomendado"
                  : "Prévia · plano Caminho"}
              </p>
              <p className="mt-1 truncate font-display text-[18px] leading-tight text-[#FFF9F0]">
                {journeyTitle ?? "Ansiedade e confiança"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#FFF9F0]/72">
                {allowsChat
                  ? (journeySubtitle ??
                    journeyShortPromise(journeySlug ?? "ansiedade-confianca"))
                  : journeyShortPromise("ansiedade-confianca")}
              </p>
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF9F0]/15 text-[#FFF9F0]"
              aria-hidden
            >
              <IconChevron className="size-4" />
            </span>
          </div>
        </Link>
      </section>

      {/* Secondary personal continuity — Espaço recedes */}
      <Link
        href="/espaco"
        className="amem-archive-row relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/[0.08] text-wine">
          <IconJournal className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-[-0.01em] text-ink">
            Espaço
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[color:var(--amem-mute)]">
            {memory.length > 0
              ? allowsChat
                ? `Linha viva · ${memory.length} marcas`
                : `${memory.length} memórias vivas`
              : "Ainda em branco"}
          </span>
        </span>
        <IconChevron className="size-4 shrink-0 text-ink-soft" />
      </Link>

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
