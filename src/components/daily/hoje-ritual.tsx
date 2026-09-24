"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { AppScreenHeader } from "@/components/platform/app-screen-header";
import { InkTrail } from "@/components/daily/ink-trail";
import { Button } from "@/components/ui/button";
import {
  CompletionFeedback,
  SoftEnter,
} from "@/components/interaction";
import { getSoftPaywallCopy } from "@/lib/commerce/soft-paywall";
import {
  DAILY_CHECKIN_LABELS,
  DAILY_CHECKIN_VALUES,
  buildDailyShareText,
  getTomorrowTeaser,
  type DailyCheckinValue,
  type DailyContent,
  type UserDailyInteraction,
} from "@/lib/daily";
import { copyTextToClipboard, isUserShareCancellation } from "@/lib/share";
import { sharePresenceShareCard } from "@/lib/share/export-presence-card";

type Phase = "start" | "mid" | "complete";

const RITUAL_STEPS = [
  "Chego",
  "Escuto",
  "Olho",
  "Falo",
  "Pratico",
  "Levo",
] as const;

/** Mid-phase moments after Chego (start). Index maps to InkTrail 1..5. */
type MidMoment = 0 | 1 | 2 | 3 | 4;

function newEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function postInteraction(body: Record<string, unknown>) {
  const res = await fetch("/api/daily/interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("persist_failed");
}

async function postProductEvent(event: string, path: string) {
  await fetch("/api/product-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({
      event,
      event_id: newEventId(event.slice(0, 12)),
      path,
    }),
  }).catch(() => undefined);
}

export function HojeRitual({
  date,
  dateLabel,
  content,
  initialInteraction,
  allowsChat,
  shareUrl,
}: {
  date: string;
  dateLabel: string;
  content: DailyContent;
  initialInteraction: UserDailyInteraction | null;
  allowsChat: boolean;
  shareUrl: string;
}) {
  const alreadyDone = Boolean(initialInteraction?.completedAt);
  const [phase, setPhase] = useState<Phase>(alreadyDone ? "complete" : "start");
  const [midMoment, setMidMoment] = useState<MidMoment>(0);
  const [checkin, setCheckin] = useState<DailyCheckinValue | null>(
    initialInteraction?.checkin ?? null,
  );
  const [saved, setSaved] = useState(Boolean(initialInteraction?.savedAt));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const viewedRef = useRef(false);
  const midRef = useRef<HTMLElement | null>(null);
  const conversarHref = `/conversar?hoje=${encodeURIComponent(date)}`;
  const tomorrow = getTomorrowTeaser(date);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    void postProductEvent("daily_opened", "/hoje");
    void postInteraction({
      date,
      viewed: true,
      eventId: newEventId("view"),
    }).catch(() => undefined);
  }, [date]);

  async function selectCheckin(value: DailyCheckinValue) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await postInteraction({
        date,
        checkin: value,
        eventId: newEventId("chk"),
      });
      setCheckin(value);
      setStatus("Check-in guardado. Só você vê.");
    } catch {
      setStatus("Não foi possível salvar o check-in.");
    } finally {
      setBusy(false);
    }
  }

  function enterMid() {
    setMidMoment(0);
    setPhase("mid");
    requestAnimationFrame(() => {
      midRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function advanceMid() {
    if (midMoment < 4) {
      setMidMoment((m) => (m + 1) as MidMoment);
      return;
    }
    void completeRitual();
  }

  async function completeRitual() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await postInteraction({
        date,
        completed: true,
        eventId: newEventId("done"),
      });
      setPhase("complete");
      void postProductEvent("daily_completed", "/hoje");
      if (!saved) {
        try {
          await postInteraction({
            date,
            saved: true,
            eventId: newEventId("autosave"),
          });
          setSaved(true);
        } catch {
          /* fail soft */
        }
      }
    } catch {
      setStatus("Não foi possível concluir agora.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDay() {
    if (busy || saved) return;
    setBusy(true);
    setStatus(null);
    try {
      await postInteraction({
        date,
        saved: true,
        eventId: newEventId("save"),
      });
      setSaved(true);
      setStatus("Guardado no seu Espaço.");
    } catch {
      setStatus("Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  function onTalkClick() {
    if (allowsChat) return;
    setPaywallOpen(true);
  }

  async function shareDay() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const text = buildDailyShareText({ content, shareUrl });
    const cardPayload = {
      eyebrow: `Presença · ${dateLabel}`,
      quote: "Você esteve presente. Isso basta por hoje.",
      reference: content.scriptureReference,
      brandWord: "Amém",
    };
    try {
      const cardResult = await sharePresenceShareCard({
        payload: cardPayload,
        format: "story",
        shareUrl,
        title: `${content.scriptureReference} · Amém`,
        text,
      });
      if (cardResult === "cancelled") {
        setBusy(false);
        return;
      }
      if (cardResult === "downloaded") {
        setStatus("Cartão salvo. Header e navegação não entram no arquivo.");
      } else if (cardResult === "shared") {
        setStatus(null);
      } else {
        const copied = await copyTextToClipboard(text);
        if (!copied) {
          setStatus("Copie o texto e compartilhe com quem quiser.");
          setBusy(false);
          return;
        }
        setStatus("Conteúdo copiado. O check-in não entra no compartilhamento.");
      }
      await postInteraction({
        date,
        shared: true,
        eventId: newEventId("share"),
      });
    } catch (error) {
      if (!isUserShareCancellation(error)) {
        try {
          await copyTextToClipboard(text);
          setStatus("Conteúdo copiado.");
          await postInteraction({
            date,
            shared: true,
            eventId: newEventId("share"),
          });
        } catch {
          setStatus("Não foi possível compartilhar agora.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const trailIndex = phase === "start" ? 0 : phase === "complete" ? 5 : midMoment + 1;
  const midVerb = RITUAL_STEPS[midMoment + 1]!;

  if (phase === "complete") {
    return (
      <section
        aria-labelledby="hoje-complete-heading"
        className="relative overflow-hidden px-1 py-4"
        data-hoje-phase="complete"
      >
        <PresenceLight size="md" centered />
        <PaperGrain />
        <SoftEnter tone="ritual" className="relative z-10">
          <AppScreenHeader
            title="Presença"
            status={<p className="text-sm text-[color:var(--amem-mute)]">Levo</p>}
            className="px-1"
          />
          <InkTrail total={6} currentIndex={5} complete className="mt-3" />

          <div className="amem-surface-dusk relative mt-5 overflow-hidden px-5 py-7">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(212,188,140,0.32),transparent_68%)]"
            />
            <CompletionFeedback
              headingId="hoje-complete-heading"
              title="Você esteve presente."
              support={"Leve isto: " + content.title.toLowerCase() + "."}
              className="relative z-10 px-0 text-[#FFF9F0] [&_h2]:text-[#FFF9F0] [&_p]:text-[#FFFDFC]/78"
            >
              <p className="sr-only">Amém.</p>
            </CompletionFeedback>
          </div>

          <div className="amem-folha mt-4 px-[18px] py-5 text-left">
            <p className="amem-type-context text-wine">Para o Espaço</p>
            <p className="mt-2 font-display text-base italic leading-snug text-ink">
              “{content.prayer.replace(/^"|"$/g, "")}”
            </p>
            <p className="mt-2 amem-type-meta">
              {saved
                ? "Salvo automaticamente · sem cartão"
                : "Pronto para guardar · sem cartão"}
            </p>
          </div>

          <div
            className="mt-4 rounded-[18px] border border-border/50 bg-[color:var(--amem-surface)]/90 px-4 py-4"
            aria-label="Amanhã"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
              Amanhã
            </p>
            <p className="mt-1.5 font-display text-[17px] leading-snug text-ink">
              {tomorrow.title}
            </p>
            <p className="mt-1 text-xs text-[color:var(--amem-mute)]">
              Quando quiser — sem pressão, sem sequência.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <p className="px-1 text-center text-sm leading-relaxed text-ink-soft">
              Próximo passo: Conversar sobre isso
            </p>
            {allowsChat ? (
              <Button
                asChild
                variant="ritual"
                className="amem-type-action min-h-[52px] w-full"
              >
                <Link href={conversarHref}>Conversar sobre isso</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ritual"
                className="amem-type-action min-h-[52px] w-full"
                onClick={onTalkClick}
              >
                Conversar sobre isso
              </Button>
            )}
            <div className="flex justify-center gap-4 pt-1">
              <button
                type="button"
                className="amem-press inline-flex min-h-11 items-center text-sm text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busy}
                onClick={() => void shareDay()}
              >
                Compartilhar
              </button>
              {!saved ? (
                <button
                  type="button"
                  className="amem-press inline-flex min-h-11 items-center text-sm text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={busy}
                  onClick={() => void saveDay()}
                >
                  Salvar
                </button>
              ) : null}
            </div>
            <p className="pt-1 text-center">
              <Link
                href="/inicio"
                className="amem-press inline-flex min-h-10 items-center justify-center px-3 text-xs text-[color:var(--amem-mute)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Início
              </Link>
            </p>
          </div>
          {status ? (
            <p className="mt-3 text-center text-sm text-ink-soft" aria-live="polite">
              {status}
            </p>
          ) : null}
          {paywallOpen ? (
            <SoftPaywallSheet
              copy={getSoftPaywallCopy("conversar", { kind: "free" })}
              defaultOpen
              onDismiss={() => setPaywallOpen(false)}
            />
          ) : null}
        </SoftEnter>
      </section>
    );
  }

  return (
    <div className="relative space-y-5 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <section
        aria-labelledby="hoje-start-heading"
        className="relative z-10 space-y-4"
        data-hoje-phase="start"
      >
        <AppScreenHeader
          title="Presença"
          status={
            <p id="hoje-start-heading" className="text-sm text-[color:var(--amem-mute)]">
              {phase === "start"
                ? "Chego · 1 de 6"
                : `${midVerb} · ${midMoment + 2} de 6`}
            </p>
          }
        />

        {phase === "start" ? (
          <SoftEnter tone="normal" className="space-y-5">
            <InkTrail total={6} currentIndex={0} />

            <div className="amem-surface-dusk relative overflow-hidden px-5 pb-6 pt-7">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(212,188,140,0.28),transparent_68%)]"
              />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
                Chego · {dateLabel}
              </p>
              <p className="relative mt-3 max-w-[14ch] font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#FFF9F0]">
                {content.title}
              </p>
              <p className="relative mt-3 max-w-[28ch] text-sm leading-relaxed text-[#FFFDFC]/72">
                Como você chega agora? ~4 min · sem cartão
              </p>
              <p className="relative mt-4 text-[11px] font-medium tracking-wide text-[rgba(212,188,140,0.75)]">
                {content.scriptureReference}
              </p>
            </div>

            <fieldset>
              <legend className="sr-only">Check-in opcional</legend>
              <p className="mb-2 text-xs text-[color:var(--amem-mute)]">
                Opcional · só você vê
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {DAILY_CHECKIN_VALUES.map((value) => {
                  const selected = checkin === value;
                  return (
                    <li key={value}>
                      <button
                        type="button"
                        disabled={busy}
                        aria-pressed={selected}
                        onClick={() => void selectCheckin(value)}
                        className={`amem-press flex min-h-11 w-full items-center justify-center rounded-full border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? "amem-surface-selected border-wine/40 font-medium text-ink"
                            : "border-border/70 bg-[color:var(--amem-surface)] text-ink-soft hover:border-wine/25"
                        }`}
                      >
                        {DAILY_CHECKIN_LABELS[value]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <Button
              type="button"
              variant="ritual"
              className="amem-type-action min-h-[52px] w-full"
              onClick={enterMid}
            >
              Entrar no ritual
            </Button>
          </SoftEnter>
        ) : null}
      </section>

      {phase === "mid" ? (
        <section
          ref={midRef}
          aria-label="Ritual de presença"
          className="relative z-10 space-y-4"
          data-hoje-phase="mid"
        >
          <SoftEnter tone="normal" key={midMoment} className="space-y-4">
            <InkTrail total={6} currentIndex={trailIndex} />

            {/* Escuto */}
            {midMoment === 0 ? (
              <div className="space-y-4 px-1">
                <p className="amem-type-context text-wine">Escuto</p>
                <p className="font-display text-[26px] font-semibold leading-snug text-ink">
                  {content.scriptureReference}
                </p>
                <p className="max-w-[36ch] text-[16px] leading-relaxed text-ink">
                  {content.paraphrase}
                </p>
                <p className="text-xs text-[color:var(--amem-mute)]">
                  Em outras palavras · não é citação inventada
                </p>
              </div>
            ) : null}

            {/* Olho */}
            {midMoment === 1 ? (
              <div className="amem-surface-scene px-5 py-6">
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--amem-plum)]">
                    Olho
                  </p>
                  <p className="mt-3 font-display text-[21px] font-semibold leading-snug text-ink">
                    {content.reflection}
                  </p>
                  <p className="mt-4 text-xs leading-relaxed text-[color:var(--amem-mute)]">
                    Não precisa responder com perfeição. Só com honestidade.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Falo */}
            {midMoment === 2 ? (
              <div className="space-y-3 rounded-[20px] border border-wine/15 bg-[color:var(--amem-surface)] px-5 py-6 shadow-[0_12px_32px_-24px_rgba(90,34,50,0.35)]">
                <p className="amem-type-context text-wine">Falo</p>
                <blockquote className="font-display text-[20px] italic leading-snug text-ink">
                  {content.prayer}
                </blockquote>
                <p className="text-xs text-[color:var(--amem-mute)]">
                  Uma frase verdadeira · no seu ritmo
                </p>
              </div>
            ) : null}

            {/* Pratico */}
            {midMoment === 3 ? (
              <div className="space-y-4 px-1">
                <p className="amem-type-context text-wine">Pratico</p>
                <div
                  className="rounded-[16px] px-4 py-4"
                  style={{ boxShadow: "inset 0 0 0 1px var(--amem-hairline-wine)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-plum)]">
                    Um passo concreto
                  </p>
                  <p className="mt-2 text-[16px] leading-relaxed text-ink">
                    {content.action}
                  </p>
                </div>
                <Button asChild variant="soft" className="min-h-11 w-full">
                  <Link href="/espaco/diario">Abrir no Diário</Link>
                </Button>
              </div>
            ) : null}

            {/* Levo */}
            {midMoment === 4 ? (
              <div className="space-y-4 px-1">
                <p className="amem-type-context text-wine">Levo</p>
                <p className="font-display text-[22px] leading-snug text-ink">
                  A presença caminha comigo.
                </p>
                <p className="text-sm leading-relaxed text-ink-soft">
                  Guarde o que ficou — e, se quiser, continue em Conversar.
                </p>
                <p className="sr-only">
                  Escuto · {content.paraphrase}. Falo · {content.prayer}. Pratico ·{" "}
                  {content.action}. Levo.
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              variant="ritual"
              className="amem-type-action min-h-[52px] w-full"
              disabled={busy}
              aria-busy={busy}
              onClick={() => advanceMid()}
            >
              Continuar
            </Button>
            <div className="flex justify-center gap-4 pt-1">
              <button
                type="button"
                className="amem-press inline-flex min-h-11 items-center text-sm text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busy || saved}
                onClick={() => void saveDay()}
              >
                {saved ? "Dia salvo" : "Salvar"}
              </button>
              <button
                type="button"
                className="amem-press inline-flex min-h-11 items-center text-sm text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busy}
                onClick={() => void shareDay()}
              >
                Compartilhar
              </button>
            </div>
          </SoftEnter>
        </section>
      ) : null}

      {status ? (
        <p className="relative z-10 text-sm text-ink-soft" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}
