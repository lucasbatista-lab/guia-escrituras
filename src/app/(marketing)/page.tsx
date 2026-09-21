import type { Metadata } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ChatDemo } from "@/components/marketing/chat-demo";
import { DeepenComparisonStatic } from "@/components/marketing/deepen-comparison-static";
import { EcosystemShowcase } from "@/components/marketing/ecosystem-showcase";
import { JourneyPreviewStatic } from "@/components/marketing/journey-preview-static";
import { PlanCards } from "@/components/marketing/plan-cards";
import { ProductHeroPreview } from "@/components/marketing/product-hero-preview";
import { PublicConversionBeacon } from "@/components/marketing/public-conversion-beacon";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { TrustPrinciples } from "@/components/marketing/trust-principles";
import { CROSS_SURFACE_COMMERCIAL_FAQ } from "@/lib/marketing/plan-faq";
import {
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";
import { buildVisitorShareUrl } from "@/lib/share/resolve-server";
import { Button } from "@/components/ui/button";

const ShareInvite = dynamic(
  () =>
    import("@/components/share/share-invite").then((m) => m.ShareInvite),
  { ssr: true },
);

export const metadata: Metadata = {
  title: { absolute: brand.seoTitle },
  description: brand.seoDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: brand.seoTitle,
    description: brand.seoDescription,
    url: brand.canonicalUrl,
    images: socialOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: brand.seoTitle,
    description: brand.seoDescription,
    images: socialTwitterImages(),
  },
};

/** Starting price for Essencial — kept in sync with plan catalog (R$ 38/mês). */
const ESSENCIAL_PRICE_LABEL = "R$ 38";

const faq = [
  {
    q: "Preciso pagar para usar?",
    a: "Não. A conta grátis inclui Hoje com Deus, Espaço (orações, diário, salvos) e o Dia 1 dos Caminhos — sem cartão. Conversar é do Essencial; Caminhos completos do plano Caminho; Aprofundar do Profundo.",
  },
  {
    q: "O Amém Chat diz falar em nome de Jesus?",
    a: "Não. É inteligência artificial baseada nas Escrituras — nunca apresentada como voz divina ou revelação. Detalhes em Transparência sobre IA.",
  },
  {
    q: "Como as respostas são criadas?",
    a: "A partir da sua mensagem, referências selecionadas ao tema, da tradição que você escolhe e de um formato de reflexão com passos práticos. Não é aconselhamento pastoral ao vivo.",
  },
  {
    q: "Posso falar sobre dinheiro, trabalho e relacionamentos?",
    a: "Sim. São temas comuns. Em saúde mental grave, direito ou emergência, busque profissionais adequados — a ferramenta não substitui isso.",
  },
  {
    q: "Qual a diferença entre as profundidades?",
    a: "Breve, Equilibrada e Profunda no perfil definem o estilo das respostas comuns. Separadamente, o plano Profundo oferece “Aprofundar esta resposta” sob demanda — uma análise mais desenvolvida só naquela mensagem, sem alterar sua preferência salva.",
  },
  {
    q: "Posso cancelar?",
    a: "Sim. A renovação automática pode ser cancelada pela sua conta no Amém Chat, com acesso até o fim do período já pago.",
  },
  {
    q: "Minhas conversas ficam públicas?",
    a: "Não. O uso das conversas segue a Política de Privacidade — não há publicação pública do seu diálogo na plataforma.",
  },
  ...CROSS_SURFACE_COMMERCIAL_FAQ,
];

function SectionShell({
  children,
  className = "",
  tone = "plain",
}: {
  children: ReactNode;
  className?: string;
  tone?: "plain" | "sand" | "card";
}) {
  const toneClass =
    tone === "sand"
      ? "bg-sand-100/60"
      : tone === "card"
        ? "border-y border-border/50 bg-card/40"
        : "";
  return (
    <section className={`${toneClass} ${className}`.trim()}>{children}</section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main id="conteudo-principal" tabIndex={-1} className="outline-none">
        <PublicConversionBeacon event="landing_viewed" />
        {/* 1. Hero — product visible in the first mobile viewport */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(198,160,90,0.2),transparent_42%),radial-gradient(ellipse_at_88%_75%,rgba(107,46,58,0.12),transparent_48%)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-7 px-4 pb-10 pt-3 sm:px-6 sm:pb-14 sm:pt-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-16 lg:pt-10">
            <div className="animate-fade-up">
              <h1 className="text-balance font-display text-[1.85rem] leading-[1.08] text-ink sm:text-4xl lg:text-[3.25rem]">
                Clareza à luz das Escrituras — comece grátis hoje.
              </h1>
              <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft sm:mt-5 sm:text-lg">
                Presença diária sem cartão. Acompanhar e conversar, quando fizer sentido.
              </p>
              <div className="mt-6 sm:mt-8">
                <Button asChild size="lg" variant="ritual" className="amem-type-action min-h-12 w-full px-5 sm:w-auto">
                  <TrackingLink href="/cadastro">Criar conta grátis</TrackingLink>
                </Button>
              </div>
              <p className="mt-3 text-xs text-ink-soft sm:text-sm">
                Sem cartão · Hoje e Espaço livres
              </p>
            </div>
            <div className="animate-fade-up-delayed">
              <ProductHeroPreview />
            </div>
          </div>
        </section>

        {/* 2. Demonstração — continuação imediata do hero */}
        <SectionShell tone="card">
          <div
            id="demonstracao"
            className="mx-auto max-w-6xl scroll-mt-6 px-4 py-8 sm:scroll-mt-8 sm:px-6 sm:py-12 lg:py-14"
          >
            <a href="#demonstracao" className="sr-only">Conhecer o Amém Chat</a>
            <p className="amem-type-context">
              Demonstração
            </p>
            <h2
              id="demo-heading"
              className="mt-2 font-display text-2xl text-ink sm:text-3xl"
            >
              Como é Conversar
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
              Uma situação · Escrituras · próximo passo.
            </p>
            <p className="mt-3">
              <TrackingLink
                href="/planos"
                conversionEvent="plans_cta_clicked"
                className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
              >
                Ver planos a partir de {ESSENCIAL_PRICE_LABEL}/mês
              </TrackingLink>
            </p>
            <div className="mt-5 max-w-2xl sm:mt-6">
              <ChatDemo />
            </div>
          </div>
        </SectionShell>

        {/* 3. Integrated product ecosystem */}
        <SectionShell tone="card">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <EcosystemShowcase />
          </div>
        </SectionShell>

        {/* 4. Continuity through a real Journey */}
        <SectionShell tone="sand">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <JourneyPreviewStatic />
          </div>
        </SectionShell>

        {/* 5. Deeper analysis, when included */}
        <SectionShell>
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <DeepenComparisonStatic />
          </div>
        </SectionShell>

        {/* 6. Plans after product value */}
        <SectionShell tone="sand">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
              Escolha seu ritmo
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Quando quiser aprofundar o acompanhamento
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Essencial abre Conversar. Caminho completa os Caminhos de 7 dias.
              Profundo acrescenta Aprofundar sob demanda.
            </p>
            <div className="mt-8">
              <PlanCards compact />
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              Pagamento seguro processado pela Stripe · Renovação cancelável pela
              sua conta.
            </p>
            <p className="mt-6">
              <TrackingLink
                href="/planos"
                conversionEvent="plans_cta_clicked"
                className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
              >
                Comparar todos os planos
              </TrackingLink>
            </p>
          </div>
        </SectionShell>

        {/* 7. Trust and boundaries */}
        <SectionShell tone="card">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <TrustPrinciples />
          </div>
        </SectionShell>

        {/* 11. FAQ */}
        <SectionShell tone="sand">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Perguntas frequentes
            </h2>
            <div className="mt-6 space-y-2">
              {faq.map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-border/60 bg-card/70 px-4 py-3"
                >
                  <summary className="cursor-pointer font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* 12. CTA final */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
          <div className="rounded-3xl border border-wine/20 bg-gradient-to-br from-wine/[0.06] to-card px-6 py-10 text-center sm:px-10">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Comece grátis — sem cartão
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink">
              Hoje e Espaço liberados na conta. Conversar e Caminhos completos
              quando fizer sentido — a partir de {ESSENCIAL_PRICE_LABEL}/mês.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="min-h-11 w-full bg-wine hover:bg-wine-soft sm:w-auto"
              >
                <TrackingLink href="/cadastro">Criar conta grátis</TrackingLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <TrackingLink href="/planos" conversionEvent="plans_cta_clicked">
                  Ver planos
                </TrackingLink>
              </Button>
            </div>
            <div className="mx-auto mt-10 max-w-md border-t border-wine/15 pt-8 text-left">
              <p className="text-center text-sm text-ink-soft">
                Conhece alguém que gostaria dessa proposta?
              </p>
              <ShareInvite
                shareUrl={buildVisitorShareUrl("home_final_cta")}
                variant="compact"
                className="mt-4"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
