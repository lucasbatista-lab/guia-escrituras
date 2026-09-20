"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DAILY_CHECKIN_LABELS,
  DAILY_CHECKIN_VALUES,
  buildDailyShareText,
  isDailyCheckinValue,
  type DailyCheckinValue,
  type DailyContent,
  type UserDailyInteraction,
} from "@/lib/daily";
import { copyTextToClipboard, isUserShareCancellation } from "@/lib/share";

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
  if (!res.ok) {
    throw new Error("persist_failed");
  }
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

export function HojeComDeusCard({
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
  const [checkin, setCheckin] = useState<DailyCheckinValue | null>(
    initialInteraction?.checkin ?? null,
  );
  const [saved, setSaved] = useState(Boolean(initialInteraction?.savedAt));
  const [completed, setCompleted] = useState(
    Boolean(initialInteraction?.completedAt),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    void postProductEvent("daily_opened", "/inicio");
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
        completed: true,
        eventId: newEventId("chk"),
      });
      setCheckin(value);
      setCompleted(true);
      setStatus("Check-in salvo. Só você vê isso.");
    } catch {
      setStatus("Não foi possível salvar o check-in. Tente de novo.");
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
        completed: true,
        eventId: newEventId("save"),
      });
      setSaved(true);
      setCompleted(true);
      setStatus("Este dia foi salvo no seu espaço.");
    } catch {
      setStatus("Não foi possível salvar. Tente de novo.");
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

  function onTalkClick() {
    if (allowsChat) return;
    setPaywallOpen(true);
    void postProductEvent("premium_prompt_viewed", "/inicio");
  }

  return (
    <section
      aria-labelledby="hoje-com-deus-heading"
      className="rounded-3xl border border-wine/20 bg-gradient-to-br from-wine/[0.07] via-card to-sand-100/80 p-5 sm:p-7"
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
        Hoje com Deus
      </p>
      <p className="mt-1 text-xs capitalize text-ink-soft">{dateLabel}</p>
      <h2
        id="hoje-com-deus-heading"
        className="mt-2 font-display text-2xl text-ink sm:text-3xl"
      >
        {content.title}
      </h2>

      <blockquote className="mt-5 border-l-2 border-wine/30 pl-4">
        <p className="font-display text-lg text-ink">{content.scriptureReference}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {content.paraphrase}
        </p>
      </blockquote>

      <div className="mt-6 space-y-5">
        <DailyBlock title="Reflexão" body={content.reflection} />
        <DailyBlock title="Oração do dia" body={content.prayer} />
        <DailyBlock title="Um passo para hoje" body={content.action} />
      </div>

      <fieldset className="mt-7">
        <legend className="text-sm font-medium text-ink">Como você está hoje?</legend>
        <p className="mt-1 text-xs text-ink-soft">
          Só você vê esta resposta. Ela não é compartilhada nem enviada à IA.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {DAILY_CHECKIN_VALUES.map((value) => {
            const selected = checkin === value;
            return (
              <li key={value}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void selectCheckin(value)}
                  className={`min-h-11 rounded-full border px-3.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "border-wine/40 bg-wine/10 text-ink"
                      : "border-border/70 bg-card/80 text-ink-soft hover:border-wine/25"
                  }`}
                  aria-pressed={selected}
                >
                  {DAILY_CHECKIN_LABELS[value]}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy || saved}
          onClick={() => void saveDay()}
        >
          {saved ? "Dia salvo" : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void shareDay()}
        >
          Compartilhar
        </Button>
        {allowsChat ? (
          <Button asChild className="min-h-11 bg-wine hover:bg-wine-soft">
            <Link href={`/conversar?hoje=${encodeURIComponent(date)}`}>
              Conversar sobre isso
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11 bg-wine hover:bg-wine-soft"
            onClick={onTalkClick}
          >
            Conversar sobre isso
          </Button>
        )}
      </div>

      {paywallOpen ? (
        <div
          className="mt-4 rounded-2xl border border-border/70 bg-background/90 p-4"
          role="region"
          aria-label="Conversar é um recurso pago"
        >
          <p className="text-sm font-medium text-ink">
            Conversar é um recurso dos planos pagos
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            O conteúdo de hoje continua disponível sem custo. O chat personalizado,
            com memória e acompanhamento, faz parte da assinatura.
          </p>
          <Button asChild className="mt-3 min-h-11">
            <Link
              href="/planos"
              onClick={() => void postProductEvent("premium_prompt_clicked", "/planos")}
            >
              Ver planos
            </Link>
          </Button>
        </div>
      ) : null}

      {status ? (
        <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
          {status}
        </p>
      ) : null}

      {completed && checkin && isDailyCheckinValue(checkin) ? (
        <p className="mt-2 text-xs text-ink-soft">
          Check-in de hoje registrado. Ele nunca entra no compartilhamento.
        </p>
      ) : null}
    </section>
  );
}

function DailyBlock({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </section>
  );
}
