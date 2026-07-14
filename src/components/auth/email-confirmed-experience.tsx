"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const REDIRECT_SECONDS = 3;

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function EmailConfirmedExperience({
  planName,
  continueHref,
  hasPlan,
}: {
  planName: string | null;
  continueHref: string;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!hasPlan || reduceMotion) return;

    const tick = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    const go = window.setTimeout(() => {
      router.push(continueHref);
    }, REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, [continueHref, hasPlan, reduceMotion, router]);

  return (
    <div className="space-y-8 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
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
          E-mail confirmado
        </h1>
        <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
          {hasPlan
            ? "Sua conta está pronta. O próximo passo é concluir o pagamento."
            : "Sua conta está pronta. Escolha um plano para continuar."}
        </p>
        {planName ? (
          <p className="mt-2 rounded-md bg-sand-100 px-3 py-1.5 text-sm text-ink">
            Plano reservado: <strong>{planName}</strong>
          </p>
        ) : null}
      </div>

      <Button asChild className="w-full bg-ink hover:bg-ink/90">
        <Link href={continueHref}>
          {hasPlan ? "Continuar para pagamento" : "Escolher meu plano"}
        </Link>
      </Button>

      {hasPlan && !reduceMotion ? (
        <p className="text-center text-xs text-ink-soft" aria-live="polite">
          Redirecionando em {secondsLeft}s…
        </p>
      ) : null}

      {hasPlan ? (
        <p className="text-center text-sm text-ink-soft">
          Se o redirecionamento não ocorrer,{" "}
          <Link
            href={continueHref}
            className="text-ink underline underline-offset-4"
          >
            continue manualmente
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
