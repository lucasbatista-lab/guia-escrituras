"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function EmailConfirmedExperience({
  planName,
  continueHref,
  hasPlan,
  emailMasked,
}: {
  planName: string | null;
  continueHref: string;
  hasPlan: boolean;
  emailMasked: string | null;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    if (hasPlan) return;
    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `freeacct_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
        : `freeacct_${Date.now().toString(36)}`;
    void fetch("/api/product-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        event: "free_account_created",
        event_id: eventId,
        path: "/email-confirmado",
      }),
    }).catch(() => undefined);
  }, [hasPlan]);

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
          Seu e-mail foi confirmado
        </h1>
        <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
          {hasPlan
            ? "Sua conta está pronta. Agora falta apenas concluir sua assinatura."
            : "Sua conta está pronta. Você já pode entrar no seu espaço diário."}
        </p>
        {emailMasked ? (
          <p className="mt-3 text-sm text-ink-soft">
            E-mail de acesso:{" "}
            <span className="font-medium text-ink">{emailMasked}</span>
          </p>
        ) : null}
        {planName ? (
          <p className="mt-3 rounded-full border border-gold/25 bg-sand-100 px-3 py-1.5 text-sm text-ink">
            Plano reservado: <strong>{planName}</strong>
          </p>
        ) : null}
      </div>

      <Button asChild className="min-h-12 w-full rounded-xl bg-wine text-base hover:bg-wine-soft">
        <Link href={hasPlan ? continueHref : "/hoje"}>
          {hasPlan ? "Continuar para pagamento" : "Começar pelo Hoje"}
        </Link>
      </Button>

      {!hasPlan ? (
        <Button asChild variant="outline" className="min-h-12 w-full rounded-xl">
          <Link href="/inicio">Ir para o Início</Link>
        </Button>
      ) : (
        <Button asChild variant="outline" className="min-h-12 w-full rounded-xl">
          <Link href="/entrar">Entrar no Amém Chat</Link>
        </Button>
      )}

      <p className="text-center text-sm text-ink-soft">
        {hasPlan
          ? "Abriu em outro aparelho? Use o mesmo e-mail e senha para continuar."
          : "Sem cartão. O ritual de hoje leva cerca de 4 minutos."}
      </p>
    </div>
  );
}
