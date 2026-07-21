"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JourneyStepCompleteButton({
  journeySlug,
  stepId,
  completed = false,
  nextStepHref,
  nextStepLabel,
  journeyHref,
  isLastStep = false,
}: {
  journeySlug: string;
  stepId: string;
  completed?: boolean;
  nextStepHref?: string | null;
  nextStepLabel?: string | null;
  journeyHref?: string;
  isLastStep?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const showCompleted = completed || justCompleted;
  const backHref = journeyHref ?? `/jornadas/${journeySlug}`;

  async function handleComplete() {
    if (loading || showCompleted) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journeys/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ journeySlug, stepId }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível salvar o progresso.");
        return;
      }
      setJustCompleted(true);
      router.refresh();
    } catch {
      setError("Não foi possível salvar o progresso. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  if (showCompleted) {
    return (
      <div
        className="space-y-3 rounded-xl border border-wine/25 bg-wine/[0.04] px-4 py-3.5"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-ink">
          {isLastStep ? "Jornada concluída nesta etapa" : "Etapa concluída"}
        </p>
        <p className="text-sm text-ink-soft">
          {isLastStep
            ? "Você pode revisar as etapas ou voltar ao início quando quiser."
            : "Seu progresso foi salvo. Siga para a próxima etapa ou volte depois."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {nextStepHref ? (
            <Button asChild className="min-h-11">
              <Link href={nextStepHref}>
                {nextStepLabel ? `Próxima: ${nextStepLabel}` : "Próxima etapa"}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="min-h-11">
            <Link href={backHref}>
              {isLastStep ? "Ver jornada" : "Voltar à jornada"}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/inicio">Ir ao início</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={loading}
        aria-busy={loading}
        onClick={() => void handleComplete()}
      >
        {loading ? "Salvando…" : "Marcar como concluída"}
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
