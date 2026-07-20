"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JourneyStepCompleteButton({
  journeySlug,
  stepId,
  disabled,
}: {
  journeySlug: string;
  stepId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (loading || disabled) return;
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
      router.refresh();
    } catch {
      setError("Não foi possível salvar o progresso. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={loading || disabled}
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
