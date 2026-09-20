"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  JOURNAL_MAX_LEN,
  type PrivateEntry,
  type PrivateEntryKind,
} from "@/lib/workspace/types";

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
      setEntries((current) => current.filter((item) => item.id !== id));
    } catch {
      setStatus("Não foi possível excluir agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
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
              className={`min-h-11 rounded-full border px-3.5 text-sm ${
                kind === value
                  ? "border-wine/40 bg-wine/[0.08] text-ink"
                  : "border-border/70 text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <label htmlFor="journal-draft" className="text-sm font-medium text-ink">
          Texto privado
        </label>
        <textarea
          id="journal-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, JOURNAL_MAX_LEN))}
          rows={5}
          maxLength={JOURNAL_MAX_LEN}
          className="min-h-32 w-full rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Isto permanece só na sua conta. Não enviamos para IA."
        />
        <Button type="submit" disabled={busy || !draft.trim()} className="min-h-11">
          Guardar
        </Button>
      </form>

      {status ? <p className="text-sm text-ink-soft">{status}</p> : null}

      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Quando quiser escrever, este diário fica privado por padrão.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-border/70 bg-card/70 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                {kindLabel(entry.kind)}
                {entry.localDate ? ` · ${entry.localDate}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {entry.body}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-3 min-h-11"
                disabled={busy}
                onClick={() => void remove(entry.id)}
              >
                Excluir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
