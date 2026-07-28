"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminEmptyState } from "@/components/admin/admin-primitives";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const digest =
    typeof error.digest === "string" && error.digest.trim()
      ? error.digest.trim()
      : null;

  useEffect(() => {
    console.error("admin_error", digest ?? "unknown");
  }, [digest]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function copyDigest() {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col justify-center py-10">
      <AdminEmptyState
        tone="error"
        title="Erro na área administrativa"
        description="Não foi possível concluir esta consulta. Tente novamente."
        className="text-left"
      />
      <h1 ref={titleRef} tabIndex={-1} className="sr-only">
        Erro na área administrativa
      </h1>
      {digest ? (
        <div className="mt-4 rounded-lg border border-border/70 bg-card/50 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Identificador técnico
          </p>
          <p className="mt-1 break-all font-mono text-sm text-ink">{digest}</p>
          <p className="mt-2 text-xs text-ink-soft">
            Informe este identificador ao suporte técnico. Não inclui mensagens,
            dados pessoais nem detalhes internos.
          </p>
          <button
            type="button"
            onClick={() => void copyDigest()}
            className="mt-3 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? "Copiado" : "Copiar identificador"}
          </button>
        </div>
      ) : null}
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
