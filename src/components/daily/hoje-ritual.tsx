"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { RitualMarker } from "@/components/brand/ritual-marker";
import { PresencePulse } from "@/components/brand/presence-pulse";
import { ScriptureRef } from "@/components/content/scripture-ref";
import { SurfaceScene } from "@/components/surfaces/scene";
import { SurfaceEditorial } from "@/components/surfaces/editorial";
import { SurfaceField } from "@/components/surfaces/field";
import { Button } from "@/components/ui/button";
import {
  DAILY_CHECKIN_LABELS,
  DAILY_CHECKIN_VALUES,
  buildDailyShareText,
  type DailyCheckinValue,
  type DailyContent,
  type UserDailyInteraction,
} from "@/lib/daily";
import { copyTextToClipboard, isUserShareCancellation } from "@/lib/share";

type Phase = "start" | "mid" | "complete";

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
  shareUrl,
}: {
  date: string;
  dateLabel: string;
  content: DailyContent;
  initialInteraction: UserDailyInteraction | null;
  shareUrl: string;
}) {
  const alreadyDone = Boolean(initialInteraction?.completedAt);
  const [phase, setPhase] = useState<Phase>(alreadyDone ? "complete" : "start");
  const [checkin, setCheckin] = useState<DailyCheckinValue | null>(
    initialInteraction?.checkin ?? null,
  );
  const [saved, setSaved] = useState(Boolean(initialInteraction?.savedAt));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const viewedRef = useRef(false);
  const midRef = useRef<HTMLElement | null>(null);

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
    setPhase("mid");
    requestAnimationFrame(() => {
      midRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  async function shareDay() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const text = buildDailyShareText({ content, shareUrl });
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: `${content.scriptureReference} · Amém Chat`,
          text,
          url: shareUrl,
        });
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

  if (phase === "complete") {
    return (
      <section
        aria-labelledby="hoje-complete-heading"
        className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-2 py-10 text-center"
        data-hoje-phase="complete"
      >
        <PresenceLight size="md" centered />
        <PaperGrain />
        <div className="relative z-10 flex max-w-sm flex-col items-center">
          <PresencePulse />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--amem-gold-600,#A8843E)]">
            Presença
          </p>
          <h2
            id="hoje-complete-heading"
            className="mt-3 font-display text-3xl text-ink"
          >
            Você chegou.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            Isso basta por hoje. A paz não pediu perfeição.
          </p>
          <p className="mt-5 font-display text-2xl text-[color:var(--amem-gold-600,#A8843E)]">
            Amém.
          </p>
          <div className="mt-5">
            <ScriptureRef>{content.scriptureReference}</ScriptureRef>
          </div>
          <div className="mt-8 flex w-full flex-col gap-2">
            <Button
              type="button"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => void shareDay()}
            >
              Compartilhar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={busy || saved}
              onClick={() => void saveDay()}
            >
              {saved ? "Guardado no Espaço" : "Salvar no Espaço"}
            </Button>
            <Button asChild variant="ghost" className="min-h-11 w-full">
              <Link href="/inicio">Voltar ao Início</Link>
            </Button>
          </div>
          {status ? (
            <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
              {status}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="relative space-y-6 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <section
        aria-labelledby="hoje-start-heading"
        className="relative z-10 space-y-4"
        data-hoje-phase="start"
      >
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
          <RitualMarker />
          Chego
        </p>
        <h1
          id="hoje-start-heading"
          className="font-display text-2xl text-ink sm:text-3xl"
        >
          {phase === "start" ? "Como você chega agora?" : "Hoje"}
        </h1>
        <p className="text-base leading-relaxed text-ink-soft">
          Nomear já é presença. Sem julgamento. · {dateLabel}
        </p>
        <p className="text-sm text-ink-soft">Cerca de 3–5 minutos.</p>

        <fieldset>
          <legend className="sr-only">Check-in opcional</legend>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {DAILY_CHECKIN_VALUES.map((value) => {
              const selected = checkin === value;
              return (
                <li key={value}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={selected}
                    onClick={() => void selectCheckin(value)}
                    className={`flex min-h-11 w-full items-center justify-center rounded-full border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? "border-wine/40 bg-wine/10 font-medium text-ink"
                        : "border-border/70 bg-card/80 text-ink-soft hover:border-wine/25"
                    }`}
                  >
                    {DAILY_CHECKIN_LABELS[value]}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {phase === "start" ? (
          <>
            <SurfaceScene>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
                Depois · Escuto
              </p>
              <p className="mt-3 font-display text-xl text-ink">{content.title}</p>
            </SurfaceScene>
            <Button type="button" className="min-h-12 w-full" onClick={enterMid}>
              Continuar
            </Button>
          </>
        ) : null}
      </section>

      {phase === "mid" ? (
        <section
          ref={midRef}
          aria-label="Ritual de presença"
          className="relative z-10 space-y-5"
          data-hoje-phase="mid"
        >
          {checkin ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                Chego
              </p>
              <span className="inline-flex min-h-9 items-center rounded-full border border-wine/30 bg-wine/10 px-3 text-sm font-medium text-ink">
                {DAILY_CHECKIN_LABELS[checkin]}
              </span>
            </div>
          ) : null}

          <SurfaceScene>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
              <RitualMarker />
              Escuto
            </p>
            <p className="mt-3 font-display text-xl leading-snug text-ink">
              {content.paraphrase}
            </p>
            <div className="mt-4">
              <ScriptureRef>{content.scriptureReference}</ScriptureRef>
            </div>
          </SurfaceScene>

          <SurfaceEditorial>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Olho
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink">
              {content.reflection}
            </p>
          </SurfaceEditorial>

          <SurfaceEditorial rule="gold">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Falo
            </p>
            <p className="mt-2 font-display text-lg italic leading-relaxed text-ink">
              {content.prayer}
            </p>
          </SurfaceEditorial>

          <SurfaceField>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Pratico
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {content.action}
            </p>
            <Button asChild variant="soft" className="mt-3 min-h-11 w-full">
              <Link href="/espaco/diario">Abrir no Diário</Link>
            </Button>
          </SurfaceField>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Levo
            </p>
            <Button
              type="button"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => void completeRitual()}
            >
              Concluir presença
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                disabled={busy || saved}
                onClick={() => void saveDay()}
              >
                {saved ? "Dia salvo" : "Salvar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                disabled={busy}
                onClick={() => void shareDay()}
              >
                Compartilhar
              </Button>
            </div>
          </div>
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
