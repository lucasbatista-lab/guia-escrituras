"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error("auth_error", error.digest ?? "unknown");
  }, [error]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center px-4 py-10">
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-2xl text-ink outline-none"
      >
        Algo deu errado
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Não foi possível concluir esta etapa. Tente novamente em instantes.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tentar de novo
        </button>
        <Link
          href="/entrar"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ir para entrar
        </Link>
      </div>
    </div>
  );
}
