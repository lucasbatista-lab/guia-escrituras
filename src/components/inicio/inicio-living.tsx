import Link from "next/link";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { RitualMarker } from "@/components/brand/ritual-marker";
import { PresencePulse } from "@/components/brand/presence-pulse";
import { ScriptureRef } from "@/components/content/scripture-ref";
import { SurfaceScene } from "@/components/surfaces/scene";
import { SurfaceEditorial } from "@/components/surfaces/editorial";
import { SurfaceField } from "@/components/surfaces/field";
import { LockPill } from "@/components/commerce/lock-pill";
import { PremiumBadge } from "@/components/commerce/premium-badge";
import { Button } from "@/components/ui/button";
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
  const dateLabel = formatBrtLongDate(today);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <header className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
            <RitualMarker />
            Bom dia
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-1 text-base text-ink-soft">
            {completed
              ? "Você já passou por Hoje. A paz não pediu perfeição."
              : "Três a cinco minutos. Sem pressa."}
          </p>
        </div>
        {allowsChat && planLabel ? (
          <PremiumBadge label={planLabel} />
        ) : (
          <span className="text-right text-xs leading-tight text-ink-soft">
            Conta
            <br />
            grátis
          </span>
        )}
      </header>

      <SurfaceScene className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
            {completed ? "Presença de hoje" : "Hoje com Deus"}
          </p>
          {completed ? <PresencePulse /> : <RitualMarker pulse />}
        </div>
        <p className="mt-1 text-xs capitalize text-ink-soft">{dateLabel}</p>
        <h2 className="mt-3 font-display text-2xl text-ink">{content.title}</h2>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          {content.paraphrase}
        </p>
        <div className="mt-3">
          <ScriptureRef>{content.scriptureReference}</ScriptureRef>
        </div>
        <Button asChild className="mt-5 min-h-12 w-full sm:w-auto">
          <Link href="/hoje">{completed ? "Revisitar ritual" : "Abrir ritual"}</Link>
        </Button>
      </SurfaceScene>

      {!completed ? (
        <div className="relative z-10">
          <InicioCheckinStrip date={today} initialCheckin={checkin} />
        </div>
      ) : null}

      <div className="relative z-10">
        <MemoryStrip items={memory} />
      </div>

      {allowsChat ? (
        <>
          {journeyTitle && journeyHref ? (
            <SurfaceEditorial rule="gold" className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                Jornada ativa
              </p>
              <p className="mt-2 font-display text-xl text-ink">{journeyTitle}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {journeySubtitle ??
                  "Sem culpa se atrasar — continue no seu ritmo."}
              </p>
              <Button asChild variant="outline" className="mt-4 min-h-11">
                <Link href={journeyHref}>Abrir capítulo</Link>
              </Button>
            </SurfaceEditorial>
          ) : null}

          <SurfaceField className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Conversa em aberto
            </p>
            {chatHref ? (
              <>
                <p className="mt-2 font-display text-base leading-relaxed text-ink">
                  {chatPreview
                    ? `“${chatPreview}”`
                    : (chatTitle ?? "Continuar de onde parou")}
                </p>
                <Button asChild variant="soft" className="mt-4 min-h-11 w-full">
                  <Link href={chatHref}>Continuar conversa</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-base leading-relaxed text-ink-soft">
                  Quando quiser, a sala quieta está pronta — sem performance.
                </p>
                <Button asChild variant="soft" className="mt-4 min-h-11 w-full">
                  <Link href="/conversar">Abrir Conversar</Link>
                </Button>
              </>
            )}
          </SurfaceField>
        </>
      ) : (
        <>
          <SurfaceEditorial className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                Caminhos
              </p>
              <LockPill label="Planos" />
            </div>
            <p className="mt-2 font-display text-lg text-ink">
              Ansiedade e confiança
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
              Dia 1 livre para sentir o ritmo. Chat e dias 2–7 no plano.
            </p>
            <Button asChild variant="soft" className="mt-3 min-h-11 w-full">
              <Link href="/jornadas">Abrir teaser</Link>
            </Button>
          </SurfaceEditorial>

          <SurfaceField className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Conversar
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink-soft">
              Uma porta contextual para aprofundar — sua conta grátis e o ritual
              de Hoje continuam inteiros.
            </p>
            <Button asChild variant="outline" className="mt-3 min-h-11 w-full">
              <Link href="/conversar">Conhecer Conversar</Link>
            </Button>
          </SurfaceField>
        </>
      )}
    </div>
  );
}
