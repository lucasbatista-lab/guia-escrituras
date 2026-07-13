"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep client logs free of stack traces in the UI.
    console.error("app_error", error.digest ?? "unknown");
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Algo deu errado</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Não foi possível concluir esta ação. Tente novamente em instantes.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-ink px-4 py-2 text-sm text-sand-50"
        >
          Tentar de novo
        </button>
        <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
