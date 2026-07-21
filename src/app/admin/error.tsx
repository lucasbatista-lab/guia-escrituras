"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error("admin_error", error.digest ?? "unknown");
  }, [error]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col justify-center py-10">
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-2xl text-ink outline-none"
      >
        Erro na área administrativa
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Não foi possível concluir esta consulta. Tente novamente.
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
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Voltar ao admin
        </Link>
      </div>
    </div>
  );
}
