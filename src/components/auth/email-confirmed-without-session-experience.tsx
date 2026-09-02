"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function EmailConfirmedWithoutSessionExperience({
  planName,
  loginHref,
  hasPlan,
}: {
  planName: string | null;
  loginHref: string;
  hasPlan: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="space-y-7 rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_70px_-42px_rgba(44,36,28,0.65)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-wine/10 text-wine"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-display text-3xl text-ink outline-none"
        >
          E-mail confirmado com sucesso
        </h1>
        <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
          Sua conta está ativa. Para continuar neste navegador, entre com o
          mesmo e-mail e senha usados no cadastro.
        </p>
        {planName ? (
          <p className="mt-3 rounded-full border border-gold/25 bg-sand-100 px-3 py-1.5 text-sm text-ink">
            Plano reservado: <strong>{planName}</strong>
          </p>
        ) : hasPlan ? null : (
          <p className="mt-3 text-sm text-ink-soft">
            Depois de entrar, você poderá escolher ou retomar seu plano.
          </p>
        )}
      </div>

      <Button asChild className="min-h-12 w-full rounded-xl bg-wine text-base hover:bg-wine-soft">
        <Link href={loginHref}>Entrar e continuar</Link>
      </Button>

      <p className="rounded-md border border-border/60 bg-sand-50/80 px-3 py-2 text-xs leading-relaxed text-ink-soft">
        Isso pode acontecer quando o link é aberto em outro navegador ou
        dispositivo. Nenhuma cobrança ocorreu nesta etapa.
      </p>
    </div>
  );
}
