"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JourneyResetButton({ journeySlug }: { journeySlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journeys/progress/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ journeySlug }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível reiniciar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Não foi possível reiniciar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        Reiniciar jornada
      </Button>
    );
  }

  return (
    <div
      className="rounded-xl border border-border/70 bg-sand-50/80 p-4"
      role="region"
      aria-labelledby="reset-journey-heading"
    >
      <p id="reset-journey-heading" className="text-sm font-medium text-ink">
        Reiniciar esta jornada?
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Seu progresso nesta trilha será zerado. Conversas e outras jornadas não
        são apagadas.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={loading}
          aria-busy={loading}
          onClick={() => void handleReset()}
        >
          {loading ? "Reiniciando…" : "Confirmar reinício"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={loading}
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
