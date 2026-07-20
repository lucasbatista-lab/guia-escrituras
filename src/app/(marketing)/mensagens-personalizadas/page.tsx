import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { SUPPORT_CHANNEL_PENDING } from "@/config/legal";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Mensagens personalizadas",
  description:
    "O plano Particular do Amém Chat é um acompanhamento sob medida, habilitado sob solicitação — sem checkout automático.",
  path: "/mensagens-personalizadas",
});

export default function MensagensPersonalizadasPage() {
  const supportEmail = brand.supportEmail;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-12 outline-none sm:px-6"
      >
        <h1 className="font-display text-4xl text-ink">Plano Particular</h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          O Particular é um acompanhamento sob medida, habilitado sob
          solicitação. Não há checkout automático nem cadastro genérico para este
          plano.
        </p>
        <div className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="font-display text-2xl text-ink">Solicitar acesso</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Descreva o contexto do acompanhamento desejado. Analisamos pedidos
            conforme disponibilidade — não há prazo de resposta assegurado.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Valor de referência: R$ 988/mês, confirmado apenas após alinhamento.
          </p>
          {supportEmail ? (
            <Button asChild className="mt-6 min-h-11 bg-wine hover:bg-wine-soft">
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent("Solicitação Particular")}`}
              >
                Enviar solicitação por e-mail
              </a>
            </Button>
          ) : (
            <p
              className="mt-6 rounded-lg border border-border/70 bg-sand-100/70 px-4 py-3 text-sm text-ink-soft"
              role="status"
            >
              {SUPPORT_CHANNEL_PENDING}. Enquanto isso, você pode conhecer os
              planos com checkout disponível.
            </p>
          )}
          <p className="mt-4 text-center text-sm text-ink-soft">
            <TrackingLink
              href="/planos"
              className="underline underline-offset-4"
            >
              Voltar aos planos
            </TrackingLink>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
