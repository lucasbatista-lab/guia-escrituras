"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  mapJourneyCompleteError,
  mapJourneyCompleteNetworkError,
} from "@/lib/journeys/complete-client-errors";

export function JourneyStepCompleteButton({
  journeySlug,
  stepId,
  completed = false,
  nextStepHref,
  nextStepLabel,
  journeyHref,
  isLastStep = false,
  journeyCompleted = false,
}: {
  journeySlug: string;
  stepId: string;
  completed?: boolean;
  nextStepHref?: string | null;
  nextStepLabel?: string | null;
  journeyHref?: string;
  isLastStep?: boolean;
  /** True only when all steps are done (not merely last step in the trail). */
  journeyCompleted?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [journeyJustFinished, setJourneyJustFinished] = useState(false);
  const showCompleted = completed || justCompleted;
  const journeyFinished = journeyCompleted || journeyJustFinished;
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
      const data = (await res.json()) as {
        message?: string;
        code?: string;
        progress?: { completedAt?: string | null };
      };
      if (!res.ok) {
        setJustCompleted(false);
        setJourneyJustFinished(false);
        setError(
          mapJourneyCompleteError({
            status: res.status,
            code: data.code,
            message: data.message,
          }),
        );
        return;
      }
      setJustCompleted(true);
      setJourneyJustFinished(Boolean(data.progress?.completedAt));
      router.refresh();
    } catch {
      setJustCompleted(false);
      setJourneyJustFinished(false);
      setError(mapJourneyCompleteNetworkError());
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
          {journeyFinished
            ? "Caminho concluído"
            : isLastStep
              ? "Último dia marcado"
              : "Dia concluído"}
        </p>
        <p className="text-sm text-ink-soft">
          {journeyFinished
            ? "Você pode rever os dias ou escolher outro caminho quando quiser."
            : isLastStep
              ? "Progresso salvo. Se ainda houver dias anteriores sem marcar, o caminho continua em andamento."
              : "Seu progresso foi salvo. Siga para o próximo dia ou volte depois."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {nextStepHref ? (
            <Button asChild className="min-h-11">
              <Link href={nextStepHref}>
                {nextStepLabel ? `Próximo: ${nextStepLabel}` : "Próximo dia"}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="min-h-11">
            <Link href={backHref}>
              {journeyFinished ? "Ver caminho" : "Voltar ao caminho"}
            </Link>
          </Button>
          {journeyFinished ? (
            <Button asChild className="min-h-11">
              <Link href="/jornadas">Ver outros caminhos</Link>
            </Button>
          ) : null}
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
        {loading ? "Salvando…" : "Concluir o dia"}
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
