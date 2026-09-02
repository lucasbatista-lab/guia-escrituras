"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function EmailConfirmNeutralExperience({
  supportEmail,
}: {
  supportEmail: string | null;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="space-y-7 rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_70px_-42px_rgba(44,36,28,0.65)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-display text-3xl text-ink outline-none"
        >
          Continuar sua conta
        </h1>
        <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
          Se você acabou de confirmar seu e-mail, entre para continuar. Se ainda
          não confirmou, verifique sua caixa de entrada ou solicite um novo link.
        </p>
      </div>

      <Button asChild className="min-h-12 w-full rounded-xl bg-wine text-base hover:bg-wine-soft">
        <Link href="/entrar?next=%2Femail-confirmado">Entrar</Link>
      </Button>

      <Button asChild variant="outline" className="min-h-12 w-full rounded-xl">
        <Link href="/confira-seu-email">Reenviar confirmação</Link>
      </Button>

      {supportEmail ? (
        <p className="text-center text-xs text-ink-soft">
          Precisa de ajuda?{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="text-ink underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
      ) : null}
    </div>
  );
}
