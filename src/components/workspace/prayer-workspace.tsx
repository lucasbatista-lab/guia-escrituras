"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IntimateSheet } from "@/components/workspace/intimate-sheet";
import { PRAYER_MAX_LEN, type UserPrayer } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

function eventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function snip(text: string, max = 96): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function humanWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function PrayerWorkspace({ initial }: { initial: UserPrayer[] }) {
  const [prayers, setPrayers] = useState(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionsId, setActionsId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const detail = detailId
    ? prayers.find((p) => p.id === detailId) ?? null
    : null;
  const actionsTarget = actionsId
    ? prayers.find((p) => p.id === actionsId) ?? null
    : null;

  async function create() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/workspace/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ body, eventId: eventId("prayer") }),
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { prayer: UserPrayer };
      setPrayers((current) => [json.prayer, ...current]);
      setDraft("");
      setComposerOpen(false);
      setStatus("Oração guardada.");
    } catch {
      setStatus("Não foi possível guardar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(
    id: string,
    payload: { status?: "open" | "answered"; body?: string },
  ) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/workspace/prayers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id, ...payload, eventId: eventId("prayer") }),
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { prayer: UserPrayer };
      setPrayers((current) =>
        current.map((item) => (item.id === id ? json.prayer : item)),
      );
      setActionsId(null);
      setStatus(
        payload.status === "answered"
          ? "Marcada como respondida."
          : payload.status === "open"
            ? "Desmarcada."
            : null,
      );
    } catch {
      setStatus("Não foi possível atualizar agora.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/workspace/prayers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("fail");
      setPrayers((current) => current.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
      setActionsId(null);
      setDetailId(null);
      setStatus("Oração excluída.");
    } catch {
      setStatus("Não foi possível excluir agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Arquivo íntimo. Nada disso vai para analytics ou IA.
        </p>
        <Button
          type="button"
          variant="ritual"
          className="min-h-11 shrink-0"
          onClick={() => {
            setStatus(null);
            setComposerOpen(true);
          }}
        >
          Nova oração
        </Button>
      </div>

      {status ? (
        <p className="text-sm text-ink-soft" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}

      {prayers.length === 0 ? (
        <div
          className="rounded-3xl px-5 py-8 text-center"
          style={{
            background: "rgba(235,231,225,0.45)",
            boxShadow: "inset 0 0 0 1px var(--amem-hairline)",
          }}
        >
          <p className="font-display text-lg text-ink">
            Ainda não há orações guardadas.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Quando quiser, este espaço fica aqui.
          </p>
          <Button
            type="button"
            variant="ritual"
            className="mt-5 min-h-11"
            onClick={() => setComposerOpen(true)}
          >
            Escrever primeira oração
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/40" aria-label="Orações">
          {prayers.map((prayer) => (
            <li key={prayer.id}>
              <div className="flex items-stretch gap-1 py-1">
                <button
                  type="button"
                  className="min-h-11 flex-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setDetailId(prayer.id)}
                >
                  <p className="text-[11px] font-semibold text-[color:var(--amem-mute)]">
                    {humanWhen(prayer.updatedAt || prayer.createdAt)}
                    {" · "}
                    {prayer.status === "answered"
                      ? "respondida"
                      : "em oração"}
                  </p>
                  <p className="mt-1 font-display text-[15px] italic leading-snug text-ink">
                    {snip(prayer.body)}
                  </p>
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Mais ações"
                  onClick={() => setActionsId(prayer.id)}
                >
                  <span aria-hidden className="text-lg leading-none">
                    ···
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <IntimateSheet
        open={composerOpen}
        onClose={() => {
          if (!busy) setComposerOpen(false);
        }}
        title="Nova oração"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label htmlFor="prayer-draft" className="sr-only">
            Texto da oração
          </label>
          <textarea
            id="prayer-draft"
            value={draft}
            onChange={(event) =>
              setDraft(event.target.value.slice(0, PRAYER_MAX_LEN))
            }
            rows={6}
            maxLength={PRAYER_MAX_LEN}
            className="min-h-36 w-full rounded-2xl border border-border/60 bg-[color:var(--amem-canvas)]/40 px-3 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Escreva com suas palavras. Fica só entre você e Deus."
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              disabled={busy || !draft.trim()}
              className="min-h-11 flex-1"
              aria-busy={busy}
            >
              {busy ? "Guardando…" : "Guardar oração"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={busy}
              onClick={() => setComposerOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </IntimateSheet>

      <IntimateSheet
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title="Oração"
      >
        {detail ? (
          <div className="space-y-5">
            <p className="text-xs text-ink-soft">
              {humanWhen(detail.updatedAt || detail.createdAt)}
              {" · "}
              {detail.status === "answered"
                ? "Marcada como respondida"
                : "Em oração"}
            </p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {detail.body}
            </p>
            <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => {
                  setDetailId(null);
                  setActionsId(detail.id);
                }}
              >
                Mais ações
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => setDetailId(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </IntimateSheet>

      <IntimateSheet
        open={Boolean(actionsTarget)}
        onClose={() => {
          setActionsId(null);
          setConfirmDeleteId(null);
        }}
        title="Ações"
      >
        {actionsTarget ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full justify-start"
              disabled={busy}
              onClick={() =>
                void patch(actionsTarget.id, {
                  status:
                    actionsTarget.status === "answered" ? "open" : "answered",
                })
              }
            >
              {actionsTarget.status === "answered"
                ? "Desmarcar respondida"
                : "Marcar como respondida"}
            </Button>
            {confirmDeleteId === actionsTarget.id ? (
              <div className="space-y-2 rounded-2xl bg-[color:var(--amem-recess)]/50 p-3">
                <p className="text-sm text-ink">Excluir esta oração?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ritual"
                    className="min-h-11 flex-1"
                    disabled={busy}
                    onClick={() => void remove(actionsTarget.id)}
                  >
                    Confirmar exclusão
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className={cn("min-h-11 w-full justify-start text-destructive")}
                disabled={busy}
                onClick={() => setConfirmDeleteId(actionsTarget.id)}
              >
                Excluir
              </Button>
            )}
          </div>
        ) : null}
      </IntimateSheet>
    </div>
  );
}
