"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FocusPageTitle } from "@/components/a11y/focus-page-title";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import type { CheckoutSuccessNextPath } from "@/lib/billing/first-premium-path";

type PollStatus =
  | "processing"
  | "activating"
  | "active"
  | "forbidden"
  | "unauthenticated"
  | "sync_error";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 24;

const COPY: Record<
  Exclude<PollStatus, "active" | "unauthenticated">,
  { title: string; body: string }
> = {
  processing: {
    title: "Confirmando seu pagamento",
    body: "Estamos confirmando sua assinatura. Isso costuma levar poucos segundos.",
  },
  activating: {
    title: "Pagamento recebido",
    body: "Seu pagamento foi registrado. Estamos ativando a assinatura na sua conta — isso costuma levar poucos segundos.",
  },
  sync_error: {
    title: "Ainda sincronizando",
    body: "Não encontramos a confirmação agora. Aguarde um instante ou abra sua conta — o pagamento não é perdido. Não é necessário pagar de novo.",
  },
  forbidden: {
    title: "Confirmação indisponível",
    body: "Esta confirmação de pagamento não pertence à conta conectada.",
  },
};

function activeCta(nextPath: CheckoutSuccessNextPath): {
  href: CheckoutSuccessNextPath;
  label: string;
  body: string;
} {
  switch (nextPath) {
    case "/personalizar":
      return {
        href: "/personalizar",
        label: "Personalizar meu Amém Chat",
        body: "Sua assinatura está ativa. Personalize em um minuto para liberar Conversar e Caminhos.",
      };
    case "/conversar":
      return {
        href: "/conversar",
        label: "Começar a Conversar",
        body: "Sua assinatura está ativa. Conversar já está liberado.",
      };
    case "/jornadas":
      return {
        href: "/jornadas",
        label: "Abrir Caminhos",
        body: "Sua assinatura está ativa. Os Caminhos completos já estão liberados.",
      };
    default:
      return {
        href: "/inicio",
        label: "Ir para o Início",
        body: "Sua assinatura está ativa. Você já pode usar o Amém Chat.",
      };
  }
}

export function CheckoutSuccessClient({
  initialStatus,
  initialNextPath = null,
  initialEmailConfirmed = true,
  initialEmailMasked = null,
}: {
  initialStatus:
    | "processing"
    | "activating"
    | "sync_error"
    | "forbidden"
    | "active";
  initialNextPath?: CheckoutSuccessNextPath | null;
  initialEmailConfirmed?: boolean;
  initialEmailMasked?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PollStatus>(initialStatus);
  const [polls, setPolls] = useState(0);
  const [nextPath, setNextPath] = useState<CheckoutSuccessNextPath | null>(
    initialNextPath,
  );
  const [emailConfirmed, setEmailConfirmed] = useState(initialEmailConfirmed);
  const [emailMasked, setEmailMasked] = useState<string | null>(
    initialEmailMasked,
  );
  const stopped = useRef(
    initialStatus === "active" || initialStatus === "forbidden",
  );
  const supportEmail = brand.supportEmail;

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
          nextPath?: CheckoutSuccessNextPath;
          emailConfirmed?: boolean;
          emailMasked?: string | null;
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
          if (typeof data.emailConfirmed === "boolean") {
            setEmailConfirmed(data.emailConfirmed);
          }
          if (data.emailMasked !== undefined) {
            setEmailMasked(data.emailMasked);
          }
          stopped.current = true;
          return;
        }

        if (data.status === "activating") {
          setStatus("activating");
        } else if (data.status === "sync_error") {
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
    if (emailConfirmed) {
      const cta = activeCta(nextPath);
      return (
        <div className="space-y-6">
          <FocusPageTitle className="font-display text-3xl text-ink">
            Pagamento confirmado
          </FocusPageTitle>
          <p
            className="text-base leading-relaxed text-ink"
            aria-live="polite"
            role="status"
          >
            {cta.body}
          </p>
          <Button
            asChild
            className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto sm:min-w-[16rem]"
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
          <p className="text-sm text-ink-soft">
            <Link
              href="/conta"
              className="underline-offset-4 hover:text-ink hover:underline"
            >
              Ver minha conta
            </Link>
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <FocusPageTitle className="font-display text-3xl text-ink">
          Pagamento confirmado
        </FocusPageTitle>
        <p
          className="text-base leading-relaxed text-ink"
          aria-live="polite"
          role="status"
        >
          Sua compra está registrada. O acesso ainda não foi liberado porque o
          e-mail precisa ser confirmado
          {emailMasked ? ` (${emailMasked})` : ""}.
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Abra o link que enviamos. Depois disso, entre de novo — não é
          necessário pagar outra vez.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild className="min-h-11 w-full bg-ink hover:bg-ink/90">
            <Link href="/confira-seu-email">Abrir opções de confirmação</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/entrar?next=/personalizar">Já confirmei — entrar</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/recuperar-senha">Recuperar senha</Link>
          </Button>
        </div>
        <p className="text-sm text-ink-soft">
          Se já pagou e não consegue acessar,{" "}
          {supportEmail ? (
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent("Paguei e não consigo acessar")}`}
              className="underline underline-offset-4 hover:text-ink"
            >
              fale com o suporte
            </a>
          ) : (
            <Link
              href="/ajuda"
              className="underline underline-offset-4 hover:text-ink"
            >
              veja a ajuda
            </Link>
          )}
          .
        </p>
      </div>
    );
  }

  const copy =
    COPY[
      status === "processing" ||
      status === "activating" ||
      status === "sync_error" ||
      status === "forbidden"
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
      {status === "processing" || status === "activating" ? (
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
        {status === "sync_error" && supportEmail ? (
          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent("Paguei e não consigo acessar")}`}
            className="inline-flex min-h-11 items-center justify-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Falar com o suporte
          </a>
        ) : null}
      </div>
    </div>
  );
}
