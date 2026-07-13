import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Mensagens personalizadas",
};

export default function MensagensPersonalizadasPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl text-ink">Plano Particular</h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          O Particular é um acompanhamento sob medida, habilitado sob
          solicitação. Não há checkout automático nem cadastro genérico para este
          plano.
        </p>
        <div className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="font-display text-2xl text-ink">Solicitar acesso</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Envie uma mensagem descrevendo o contexto do acompanhamento desejado.
            Respondemos quando for possível analisar o pedido — sem prazo
            garantido de resposta.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Valor de referência: R$ 988/mês, confirmado apenas após alinhamento.
          </p>
          <Button asChild className="mt-6 bg-wine hover:bg-wine-soft">
            <a
              href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent("Solicitação Particular")}`}
            >
              Enviar solicitação por e-mail
            </a>
          </Button>
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
