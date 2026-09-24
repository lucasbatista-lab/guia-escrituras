import Link from "next/link";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { Button } from "@/components/ui/button";
import { PlanChip } from "@/components/inicio/plan-chip";
import { InicioCheckinStrip } from "@/components/inicio/inicio-checkin-strip";
import { AppScreenHeader } from "@/components/platform/app-screen-header";
import { loadRecentMemory } from "@/components/inicio/memory-strip";
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
  getTomorrowTeaser,
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

/** Safe memory label — never full prayer/journal body on home. */
function memoryHint(snip: string | null, count: number): string {
  if (snip) {
    const clean = snip.replace(/^"|"$/g, "").trim();
    if (clean.length <= 42) return clean;
    return `${clean.slice(0, 40).trimEnd()}…`;
  }
  if (count > 0) return `${count} marcas no arquivo`;
  return "Arquivo íntimo · ainda em branco";
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
  const tomorrow = getTomorrowTeaser(today);
  void greeting;
  void dateLabel;

  const journeySlug = slugFromJourneyHref(journeyHref);
  const hasActiveJourney = Boolean(journeyTitle || journeyHref);
  const memorySnip = memory[0]?.snip ?? null;

  return (
    <div className="relative space-y-5 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <AppScreenHeader
        title="Início"
        trailing={
          allowsChat ? (
            <PlanChip variant="paid" label={planLabel ?? "Caminho"} />
          ) : (
            <PlanChip variant="free" label="Grátis" />
          )
        }
      />

      {completed ? (
        /* —— Pós-Hoje: living home, not a dead card —— */
        <div className="relative z-10 space-y-5">
          <section
            className="relative overflow-hidden rounded-[22px] border border-wine/20 bg-[color:var(--amem-surface)] px-5 py-5"
            aria-labelledby="inicio-hoje-heading"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--amem-wine-deep),var(--amem-brass))]"
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
              Presença · {dateShort}
            </p>
            <h2
              id="inicio-hoje-heading"
              className="mt-1.5 font-display text-[22px] leading-tight text-ink"
            >
              Você esteve presente
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {content.title} · ritual concluído
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/hoje">Revisitar</Link>
              </Button>
              {allowsChat ? (
                <Button asChild variant="soft" className="min-h-11">
                  <Link href="/conversar">Conversar</Link>
                </Button>
              ) : null}
            </div>
          </section>

          {/* Active journey elevated after completion */}
          <section aria-labelledby="inicio-caminho-heading">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p
                id="inicio-caminho-heading"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
              >
                {hasActiveJourney ? "Continuar o caminho" : "Um caminho"}
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
                size="hero"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3.5 pt-10">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F0E6D0]/88">
                    <IconJourney className="size-3.5 opacity-90" />
                    {hasActiveJourney ? "Em andamento" : "Dia 1 grátis"}
                  </p>
                  <p className="mt-1 truncate font-display text-[18px] leading-tight text-[#FFF9F0]">
                    {journeyTitle ?? "Ansiedade e confiança"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#FFF9F0]/72">
                    {journeySubtitle ??
                      journeyShortPromise(journeySlug ?? "ansiedade-confianca")}
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

          <Link
            href="/espaco"
            className="amem-archive-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/[0.08] text-wine">
              <IconJournal className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold tracking-[-0.01em] text-ink">
                Espaço
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-[color:var(--amem-mute)]">
                {memoryHint(memorySnip, memory.length)}
              </span>
            </span>
            <IconChevron className="size-4 shrink-0 text-ink-soft" />
          </Link>

          <div className="rounded-[18px] border border-border/50 bg-[color:var(--amem-surface)]/80 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
              Amanhã
            </p>
            <p className="mt-1 font-display text-[15px] leading-snug text-ink">
              {tomorrow.title}
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--amem-mute)]">
              Sem pressão · quando quiser voltar
            </p>
          </div>
        </div>
      ) : (
        /* —— Hoje incomplete: experience-first viewport —— */
        <>
          <section
            className="amem-surface-dusk relative z-10 overflow-hidden px-5 pb-7 pt-7"
            aria-labelledby="inicio-hoje-heading"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-[radial-gradient(circle,rgba(212,188,140,0.3),transparent_68%)]"
            />
            <div
              aria-hidden
              className="amem-ink-trail pointer-events-none absolute inset-x-5 top-5 flex gap-1.5 opacity-70"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i === 0
                      ? "bg-[rgba(212,188,140,0.95)]"
                      : "bg-[rgba(255,249,240,0.18)]"
                  }`}
                />
              ))}
            </div>
            <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
              Hoje · {dateShort}
            </p>
            <h2
              id="inicio-hoje-heading"
              className="relative mt-2.5 max-w-[15ch] font-display text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#FFF9F0]"
            >
              {content.title}
            </h2>
            <p className="relative mt-2.5 max-w-[28ch] text-sm leading-relaxed text-[#FFFDFC]/72">
              Ritual livre · ~4 min · sem cartão
            </p>
            <p className="relative mt-3 text-[11px] tracking-wide text-[rgba(212,188,140,0.7)]">
              {content.scriptureReference}
            </p>
            <div className="relative mt-6">
              <Button
                asChild
                variant="ritual"
                className="min-h-[52px] w-full bg-[#FFF9F0] text-[15px] font-bold text-[color:var(--amem-wine-deep,#5A2232)] hover:bg-[#FFF9F0]/92"
              >
                <Link
                  href="/hoje"
                  className="inline-flex items-center justify-center gap-2"
                >
                  Entrar no Hoje
                  <IconChevron className="size-4" />
                </Link>
              </Button>
            </div>
          </section>

          <div className="relative z-10">
            <InicioCheckinStrip date={today} initialCheckin={checkin} />
          </div>

          <section className="relative z-10" aria-labelledby="inicio-caminho-heading">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p
                id="inicio-caminho-heading"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
              >
                {hasActiveJourney ? "Seu caminho" : "Caminhos"}
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
                size={hasActiveJourney ? "hero" : "compact"}
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
                      : "Dia 1 grátis"}
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
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-[color:var(--amem-mute)]">
                {memoryHint(memorySnip, memory.length)}
              </span>
            </span>
            <IconChevron className="size-4 shrink-0 text-ink-soft" />
          </Link>
        </>
      )}

      {allowsChat ? (
        <Link
          href={chatHref ?? "/conversar"}
          className="amem-folha relative z-10 block px-[18px] py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
            Conversar
          </p>
          <p className="mt-2 font-display text-[17px] italic leading-snug text-ink">
            {chatPreview
              ? chatPreview
              : (chatTitle ?? "como orar quando estou seco?")}
          </p>
        </Link>
      ) : null}
    </div>
  );
}
