"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IntimateSheet } from "@/components/workspace/intimate-sheet";
import {
  JOURNAL_MAX_LEN,
  type PrivateEntry,
  type PrivateEntryKind,
} from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

function eventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function kindLabel(kind: PrivateEntryKind): string {
  if (kind === "gratitude") return "Gratidão";
  if (kind === "journey_step") return "Anotação de jornada";
  return "Reflexão";
}

function snip(text: string, max = 96): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function JournalWorkspace({
  initial,
  today,
}: {
  initial: PrivateEntry[];
  today: string;
}) {
  const [entries, setEntries] = useState(
    initial.filter((entry) => entry.kind !== "journey_step"),
  );
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<"journal" | "gratitude">("gratitude");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const detail = detailId
    ? entries.find((e) => e.id === detailId) ?? null
    : null;

  async function create() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/workspace/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          kind,
          body,
          localDate: today,
          eventId: eventId("journal"),
        }),
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { entry: PrivateEntry };
      setEntries((current) => [json.entry, ...current]);
      setDraft("");
      setComposerOpen(false);
      setHighlightId(json.entry.id);
      setStatus("Guardado.");
      window.setTimeout(() => setHighlightId((id) => (id === json.entry.id ? null : id)), 900);
    } catch {
      setStatus("Não foi possível guardar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/workspace/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("fail");
      setRemovingId(id);
      setConfirmDeleteId(null);
      setDetailId(null);
      window.setTimeout(() => {
        setEntries((current) => current.filter((item) => item.id !== id));
        setRemovingId(null);
        setStatus("Excluído.");
      }, 220);
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
          Isto permanece só na sua conta. Não enviamos para IA, analytics nem
          modelos.
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
          Escrever
        </Button>
      </div>

      {status ? (
        <p className="text-sm text-ink-soft" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div
          className="rounded-3xl px-5 py-8 text-center"
          style={{
            background: "rgba(235,231,225,0.45)",
            boxShadow: "inset 0 0 0 1px var(--amem-hairline)",
          }}
        >
          <p className="font-display text-lg text-ink">
            Quando quiser escrever, este diário fica privado por padrão.
          </p>
          <Button
            type="button"
            variant="ritual"
            className="mt-5 min-h-11"
            onClick={() => setComposerOpen(true)}
          >
            Primeira anotação
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/40" aria-label="Diário">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                removingId === entry.id && "amem-remove-out",
                highlightId === entry.id && "amem-highlight-once rounded-xl",
              )}
            >
              <button
                type="button"
                className="amem-press flex min-h-11 w-full flex-col py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setDetailId(entry.id);
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                  {kindLabel(entry.kind)}
                  {entry.localDate ? ` · ${entry.localDate}` : ""}
                </p>
                <p className="mt-1 font-display text-[15px] italic leading-snug text-ink">
                  {snip(entry.body)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <IntimateSheet
        open={composerOpen}
        onClose={() => {
          if (!busy) setComposerOpen(false);
        }}
        title="Nova anotação"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Tipo de anotação</legend>
            {(
              [
                ["gratitude", "Gratidão de hoje"],
                ["journal", "Minha reflexão"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn(
                  "amem-press min-h-11 rounded-full border px-3.5 text-sm",
                  kind === value
                    ? "amem-surface-selected border-wine/40 text-ink"
                    : "border-border/70 text-ink-soft",
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <label htmlFor="journal-draft" className="sr-only">
            Texto privado
          </label>
          <textarea
            id="journal-draft"
            value={draft}
            onChange={(event) =>
              setDraft(event.target.value.slice(0, JOURNAL_MAX_LEN))
            }
            rows={6}
            maxLength={JOURNAL_MAX_LEN}
            className="min-h-36 w-full rounded-2xl border border-border/60 bg-[color:var(--amem-canvas)]/40 px-3 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Texto privado — só na sua conta."
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="ritual"
              disabled={busy || !draft.trim()}
              className="amem-type-action min-h-11 flex-1"
              aria-busy={busy}
            >
              {busy ? "Guardando…" : "Guardar"}
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
        onClose={() => {
          setDetailId(null);
          setConfirmDeleteId(null);
        }}
        title={detail ? kindLabel(detail.kind) : "Anotação"}
      >
        {detail ? (
          <div className="space-y-5">
            <p className="text-xs text-ink-soft">
              {detail.localDate ?? humanFallback(detail.createdAt)}
            </p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {detail.body}
            </p>
            <div className="space-y-2 border-t border-border/40 pt-4">
              {confirmDeleteId === detail.id ? (
                <div className="space-y-2 rounded-2xl bg-[color:var(--amem-recess)]/50 p-3">
                  <p className="text-sm text-ink">Excluir esta anotação?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 flex-1 text-destructive"
                      disabled={busy}
                      aria-busy={busy}
                      onClick={() => void remove(detail.id)}
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
                  className="min-h-11 w-full justify-start text-destructive"
                  disabled={busy}
                  onClick={() => setConfirmDeleteId(detail.id)}
                >
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => setDetailId(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </IntimateSheet>
    </div>
  );
}

function humanFallback(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
