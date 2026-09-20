"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PRAYER_MAX_LEN, type UserPrayer } from "@/lib/workspace/types";

function eventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function PrayerWorkspace({ initial }: { initial: UserPrayer[] }) {
  const [prayers, setPrayers] = useState(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    } catch {
      setStatus("Não foi possível guardar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, payload: { status?: "open" | "answered"; body?: string }) {
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
        <label htmlFor="prayer-draft" className="text-sm font-medium text-ink">
          Nova oração
        </label>
        <textarea
          id="prayer-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, PRAYER_MAX_LEN))}
          rows={4}
          maxLength={PRAYER_MAX_LEN}
          className="min-h-28 w-full rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Escreva com suas palavras. Fica só entre você e Deus."
        />
        <Button type="submit" disabled={busy || !draft.trim()} className="min-h-11">
          Guardar oração
        </Button>
      </form>

      {status ? <p className="text-sm text-ink-soft">{status}</p> : null}

      {prayers.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Ainda não há orações guardadas. Quando quiser, este espaço fica aqui.
        </p>
      ) : (
        <ul className="space-y-3">
          {prayers.map((prayer) => (
            <li
              key={prayer.id}
              className="rounded-2xl border border-border/70 bg-card/70 p-4"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {prayer.body}
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                {prayer.status === "answered" ? "Marcada como respondida" : "Em oração"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() =>
                    void patch(prayer.id, {
                      status: prayer.status === "answered" ? "open" : "answered",
                    })
                  }
                >
                  {prayer.status === "answered"
                    ? "Desmarcar respondida"
                    : "Marcar como respondida"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => void remove(prayer.id)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
