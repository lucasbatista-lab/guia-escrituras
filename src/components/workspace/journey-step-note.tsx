"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JOURNAL_MAX_LEN, type PrivateEntry } from "@/lib/workspace/types";

export function JourneyStepNote({
  journeySlug,
  stepId,
  initial,
}: {
  journeySlug: string;
  stepId: string;
  initial: PrivateEntry | null;
}) {
  const [entry, setEntry] = useState(initial);
  const [draft, setDraft] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/workspace/entries", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(
          entry
            ? { id: entry.id, body }
            : { kind: "journey_step", body, journeySlug, stepId },
        ),
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { entry: PrivateEntry };
      setEntry(json.entry);
      setDraft(json.entry.body);
      setStatus("Anotação guardada. Ela não entra no chat.");
    } catch {
      setStatus("Não foi possível guardar agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="step-note-heading" className="space-y-3">
      <h2
        id="step-note-heading"
        className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft"
      >
        Anotação pessoal (opcional)
      </h2>
      <p className="text-sm leading-relaxed text-ink-soft">
        Só você vê isto. Não enviamos para o chat nem para estatísticas.
      </p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value.slice(0, JOURNAL_MAX_LEN))}
        rows={4}
        maxLength={JOURNAL_MAX_LEN}
        className="min-h-28 w-full rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Uma frase, um pedido, um lembrete."
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={busy || !draft.trim()}
        onClick={() => void save()}
      >
        Guardar anotação
      </Button>
      {status ? <p className="text-sm text-ink-soft">{status}</p> : null}
    </section>
  );
}
