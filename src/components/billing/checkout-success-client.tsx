"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FocusPageTitle } from "@/components/a11y/focus-page-title";
import { Button } from "@/components/ui/button";

type PollStatus =
  | "processing"
  | "active"
  | "forbidden"
  | "unauthenticated"
  | "sync_error";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 24; // ~60s

const COPY: Record<
  Exclude<PollStatus, "active" | "unauthenticated">,
  { title: string; body: string }
> = {
  processing: {
    title: "Confirmando seu pagamento",
    body: "Estamos confirmando sua assinatura. Isso costuma levar poucos segundos — você permanece conectado enquanto aguarda.",
  },
  sync_error: {
    title: "Ainda sincronizando",
    body: "Não encontramos a confirmação agora. Aguarde um instante ou abra sua conta — o pagamento não é perdido.",
  },
  forbidden: {
    title: "Confirmação indisponível",
    body: "Esta confirmação de pagamento não pertence à conta conectada.",
  },
};

function primaryCtaLabel(nextPath: string) {
  if (nextPath === "/personalizar") {
    return "Personalizar minha experiência";
  }
  return "Começar uma reflexão";
}

function activeBody(nextPath: string) {
  if (nextPath === "/personalizar") {
    return "Agora, ajuste sua experiência para receber reflexões mais alinhadas à forma como você vive a fé.";
  }
  return "Sua assinatura está ativa. Você já pode começar uma reflexão no Amém Chat.";
}

export function CheckoutSuccessClient({
  initialStatus,
  initialNextPath = null,
}: {
  initialStatus: "processing" | "sync_error" | "forbidden" | "active";
  initialNextPath?: "/personalizar" | "/inicio" | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PollStatus>(initialStatus);
  const [polls, setPolls] = useState(0);
  const [nextPath, setNextPath] = useState<string | null>(initialNextPath);
  const stopped = useRef(initialStatus === "active" || initialStatus === "forbidden");

  useEffect(() => {
    if (initialStatus === "forbidden" || initialStatus === "active") return;
    if (stopped.current) return;

    let cancelled = false;
    let count = 0;

    async function tick() {
      if (cancelled || stopped.current) return;
      count += 1;
      setPolls(count);
      try {
        const res = await fetch("/api/billing/checkout-success", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json()) as {
          status?: PollStatus;
          nextPath?: string;
        };
        if (cancelled) return;

        if (data.status === "unauthenticated") {
          stopped.current = true;
          router.replace("/entrar?next=/assinatura/sucesso");
          return;
        }

        if (data.status === "forbidden") {
          setStatus("forbidden");
          stopped.current = true;
          return;
        }

        if (data.status === "active" && data.nextPath) {
          setStatus("active");
          setNextPath(data.nextPath);
          stopped.current = true;
          // Stay on confirmation — no auto-redirect so the next step is clear.
          return;
        }

        if (data.status === "sync_error") {
          setStatus("sync_error");
        } else {
          setStatus("processing");
        }

        if (count >= MAX_POLLS) {
          stopped.current = true;
          setStatus((s) => (s === "forbidden" ? s : "sync_error"));
          return;
        }
      } catch {
        if (!cancelled && count >= MAX_POLLS) {
          setStatus("sync_error");
          stopped.current = true;
        }
      }
    }

    void tick();
    const id = window.setInterval(() => {
      if (stopped.current || count >= MAX_POLLS) {
        window.clearInterval(id);
        return;
      }
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initialStatus, router]);

  if (status === "active" && nextPath) {
    return (
      <div className="space-y-6">
        <FocusPageTitle className="font-display text-3xl text-ink">
          Assinatura confirmada
        </FocusPageTitle>
        <p className="text-base leading-relaxed text-ink" aria-live="polite" role="status">
          {activeBody(nextPath)}
        </p>
        <Button asChild className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto sm:min-w-[16rem]">
          <Link href={nextPath}>{primaryCtaLabel(nextPath)}</Link>
        </Button>
        <p className="text-sm text-ink-soft">
          {nextPath === "/inicio" ? (
            <>
              <Link
                href="/conversar"
                className="underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Ir para o Amém Chat
              </Link>
              {" · "}
            </>
          ) : null}
          <Link
            href="/conta"
            className="underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Ver minha conta
          </Link>
        </p>
      </div>
    );
  }

  const copy =
    COPY[
      status === "processing" || status === "sync_error" || status === "forbidden"
        ? status
        : "processing"
    ];

  return (
    <div className="space-y-6">
      <FocusPageTitle className="font-display text-3xl text-ink">
        {copy.title}
      </FocusPageTitle>
      <p className="text-sm text-ink-soft" aria-live="polite" role="status">
        {copy.body}
      </p>
      {status === "processing" ? (
        <p className="text-xs text-ink-soft" aria-live="polite">
          Verificando confirmação{polls > 0 ? ` (${polls}/${MAX_POLLS})` : "…"}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {status !== "forbidden" ? (
          <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
            <Link href="/assinatura/sucesso">Atualizar status</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/conta">Ver minha conta</Link>
        </Button>
      </div>
    </div>
  );
}
