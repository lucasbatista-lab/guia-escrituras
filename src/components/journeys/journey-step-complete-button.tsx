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
  dayNumber,
  totalDays = 7,
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
  dayNumber?: number;
  totalDays?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [journeyJustFinished, setJourneyJustFinished] = useState(false);
  const showCompleted = completed || justCompleted;
  const journeyFinished = journeyCompleted || journeyJustFinished;
  const backHref = journeyHref ?? `/jornadas/${journeySlug}`;
  const day = dayNumber ?? null;
  const progressLabel =
    day != null
      ? `${day} de ${totalDays} dias`
      : null;

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
    if (journeyFinished) {
      return (
        <div
          className="relative overflow-hidden rounded-[22px] border border-wine/25 bg-[linear-gradient(165deg,rgba(90,34,50,0.08),rgba(255,253,252,0.95))] px-5 py-6"
          role="status"
          aria-live="polite"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[radial-gradient(circle,rgba(184,150,90,0.28),transparent_68%)]"
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
            Caminho completo
          </p>
          <p className="mt-2 font-display text-[22px] leading-snug text-ink">
            Caminho concluído
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Sete dias, no seu ritmo. Você pode rever o percurso, guardar algo no
            Espaço ou escolher outro caminho quando quiser.
          </p>
          <div
            aria-hidden
            className="mt-4 flex gap-1.5"
          >
            {Array.from({ length: totalDays }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full bg-wine/70"
              />
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild variant="ritual" className="min-h-11">
              <Link href={backHref}>Ver caminho</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/espaco/salvos">Guardar no Espaço</Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link href="/jornadas">Ver outros caminhos</Link>
            </Button>
            <Button asChild variant="ghost" className="min-h-11">
              <Link href="/inicio">Ir ao início</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="space-y-3 rounded-[20px] border border-wine/20 bg-wine/[0.04] px-4 py-4"
        role="status"
        aria-live="polite"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
          {isLastStep ? "Último dia" : "Dia concluído"}
          {progressLabel ? ` · ${progressLabel}` : null}
        </p>
        <p className="font-display text-[18px] leading-snug text-ink">
          {isLastStep ? "Último dia marcado" : "Dia concluído"}
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          {isLastStep
            ? "Progresso salvo. Se ainda houver dias anteriores sem marcar, o caminho continua em andamento."
            : "Seu progresso foi salvo. O próximo dia espera no seu ritmo — sem culpa se voltar depois."}
        </p>
        {day != null && day < totalDays ? (
          <div aria-hidden className="flex gap-1">
            {Array.from({ length: totalDays }).map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < day ? "bg-wine/75" : "bg-[color:var(--amem-trilho-track)]/50"
                }`}
              />
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {nextStepHref ? (
            <Button asChild variant="ritual" className="min-h-11">
              <Link href={nextStepHref}>
                {nextStepLabel ? `Próximo: ${nextStepLabel}` : "Próximo dia"}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="min-h-11">
            <Link href={backHref}>Voltar ao caminho</Link>
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
        variant="ritual"
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
