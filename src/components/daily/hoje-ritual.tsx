"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { InkTrail } from "@/components/daily/ink-trail";
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

const RITUAL_STEPS = [
  "Chego",
  "Escuto",
  "Olho",
  "Falo",
  "Pratico",
  "Levo",
] as const;

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
      // Auto-save to Espaço (visual claim on complete card)
      if (!saved) {
        try {
          await postInteraction({
            date,
            saved: true,
            eventId: newEventId("autosave"),
          });
          setSaved(true);
        } catch {
          /* fail soft — user can still save manually */
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
        className="relative overflow-hidden px-1 py-4"
        data-hoje-phase="complete"
      >
        <PresenceLight size="md" centered />
        <PaperGrain />
        <div className="relative z-10">
          <header className="flex items-end justify-between gap-3 px-1">
            <h1 className="font-display text-xl font-semibold text-[color:var(--amem-wine-deep)]">
              Presença
            </h1>
            <p className="text-sm text-[color:var(--amem-mute)]">Levo</p>
          </header>
          <InkTrail total={6} currentIndex={5} complete className="mt-3" />

          <div className="mt-4 flex flex-col items-center px-3 text-center">
            <div
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-[0_12px_28px_var(--amem-shadow)]"
              style={{
                background:
                  "radial-gradient(circle at 40% 35%, #FFFDFC, #E8E2D8)",
                boxShadow:
                  "0 12px 28px var(--amem-shadow), inset 0 0 0 1px rgba(255,255,255,0.9)",
              }}
              aria-hidden
            >
              <span className="amem-ink-sig w-10" />
            </div>
            <h2
              id="hoje-complete-heading"
              className="mt-5 font-display text-[26px] font-semibold leading-tight text-ink"
            >
              Você esteve presente.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Leve isto: {content.title.toLowerCase()}.
            </p>
            <p className="sr-only">Amém.</p>
          </div>

          <div className="amem-folha mt-5 px-[18px] py-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
              Para o Espaço
            </p>
            <p className="mt-2 font-display text-base italic leading-snug text-ink">
              “{content.prayer.replace(/^"|"$/g, "")}”
            </p>
            <p className="mt-2 text-xs text-[color:var(--amem-mute)]">
              {saved
                ? "Salvo automaticamente · sem cartão"
                : "Pronto para guardar · sem cartão"}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="ritual" className="min-h-[52px] w-full text-[15px] font-bold">
              <Link href="/inicio">Voltar ao Início</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full"
              disabled={busy}
              onClick={() => void shareDay()}
            >
              Compartilhar
            </Button>
            {!saved ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={busy}
                onClick={() => void saveDay()}
              >
                Salvar no Espaço
              </Button>
            ) : null}
          </div>
          {status ? (
            <p className="mt-3 text-center text-sm text-ink-soft" aria-live="polite">
              {status}
            </p>
          ) : null}
        </div>
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
        <header className="flex items-end justify-between gap-3">
          <h1
            id="hoje-start-heading"
            className="font-display text-xl font-semibold text-[color:var(--amem-wine-deep)]"
          >
            Presença
          </h1>
          <p className="text-sm text-[color:var(--amem-mute)]">
            {phase === "start" ? "Chego · 1 de 6" : "Olho · 3 de 6"}
          </p>
        </header>

        {phase === "start" ? (
          <>
            <InkTrail total={6} currentIndex={0} />
            <p className="text-base leading-relaxed text-ink-soft">
              Como você chega agora? Nomear já é presença. · {dateLabel}
            </p>
            <p className="text-sm text-[color:var(--amem-mute)]">
              Cerca de 3–5 minutos.
            </p>

            <fieldset>
              <legend className="sr-only">Check-in opcional</legend>
              <ul className="mt-1 grid grid-cols-2 gap-2">
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

            <div className="amem-surface-scene p-5">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--amem-plum)]">
                  Depois · Escuto
                </p>
                <p className="mt-3 font-display text-xl text-ink">{content.title}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ritual"
              className="min-h-[52px] w-full text-[15px] font-bold"
              onClick={enterMid}
            >
              Continuar
            </Button>
          </>
        ) : null}
      </section>

      {phase === "mid" ? (
        <section
          ref={midRef}
          aria-label="Ritual de presença"
          className="relative z-10 space-y-3"
          data-hoje-phase="mid"
        >
          <InkTrail total={6} currentIndex={2} />

          <div
            className="mx-1 rounded-[14px] border-l-2 px-3.5 py-2.5 opacity-72"
            style={{
              background: "rgba(255,253,252,0.50)",
              borderColor: "rgba(90,34,50,0.14)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--amem-mute)]">
              Já passou · {RITUAL_STEPS[1]}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">
              {content.paraphrase}
            </p>
          </div>

          <div className="amem-surface-scene px-5 py-6">
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--amem-plum)]">
                Agora · {RITUAL_STEPS[2]}
              </p>
              <p className="mt-3 font-display text-[22px] font-semibold leading-snug text-ink">
                {content.reflection}
              </p>
              <p className="mt-3.5 text-xs leading-relaxed text-[color:var(--amem-mute)]">
                Não precisa responder com perfeição. Só com honestidade.
              </p>
              <p className="sr-only">
                Escuto · {content.paraphrase}. Falo · {content.prayer}. Pratico ·{" "}
                {content.action}. Levo.
              </p>
            </div>
          </div>

          <div
            className="mx-1 flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5"
            style={{ boxShadow: "inset 0 0 0 1px var(--amem-hairline-wine)" }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-plum)]">
                Em seguida · {RITUAL_STEPS[3]}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                Uma frase verdadeira
              </p>
            </div>
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#FFFDFC] shadow-[0_6px_14px_rgba(90,34,50,0.22)]"
              style={{ background: "var(--amem-wine-deep)" }}
            >
              →
            </span>
          </div>

          {/* Keep ritual moments reachable for logic/tests without progress rings */}
          <details className="mx-1 rounded-2xl bg-[color:var(--amem-surface)] px-4 py-3 shadow-[inset_0_0_0_1px_var(--amem-hairline)]">
            <summary className="cursor-pointer text-sm font-medium text-ink-soft">
              Ver Escuto · Falo · Pratico · Levo
            </summary>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink">
              <p>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
                  Escuto
                </span>
                <br />
                {content.paraphrase}
              </p>
              <p>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
                  Falo
                </span>
                <br />
                <span className="font-display italic">{content.prayer}</span>
              </p>
              <p>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
                  Pratico
                </span>
                <br />
                {content.action}
              </p>
              <p>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
                  Levo
                </span>
                <br />
                A presença caminha comigo.
              </p>
              <Button asChild variant="soft" className="min-h-11 w-full">
                <Link href="/espaco/diario">Abrir no Diário</Link>
              </Button>
            </div>
          </details>

          <Button
            type="button"
            variant="ritual"
            className="min-h-[52px] w-full text-[15px] font-bold"
            disabled={busy}
            onClick={() => void completeRitual()}
          >
            Continuar
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
