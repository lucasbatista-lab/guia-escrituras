import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { PaidLandingDemo } from "@/components/marketing/paid-landing/paid-landing-demo";
import { PaidLandingMedia } from "@/components/marketing/paid-landing/paid-landing-media";
import { PaidLandingMobileCta } from "@/components/marketing/paid-landing/paid-landing-mobile-cta";
import { PaidLandingPlans } from "@/components/marketing/paid-landing/paid-landing-plans";
import {
  PaidLandingScrollCta,
} from "@/components/marketing/paid-landing/paid-landing-scroll-cta";
import { PublicConversionBeacon } from "@/components/marketing/public-conversion-beacon";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import {
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";

const PAGE_TITLE = "Comece uma conversa guiada pelas Escrituras";
const PAGE_DESCRIPTION =
  "Conte o que está vivendo e organize seus próximos passos por meio de uma conversa contextual — sem anúncios no produto e com limites claros de IA.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/comece" },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  openGraph: {
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    url: `${brand.canonicalUrl}/comece`,
    siteName: brand.name,
    locale: "pt_BR",
    type: "website",
    images: socialOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    images: socialTwitterImages(),
  },
};

const SITUATIONS = [
  "Decisões",
  "Relacionamentos",
  "Perdão e limites",
  "Ansiedade e medo",
  "Conflitos familiares",
  "Culpa e arrependimento",
  "Trabalho e dinheiro",
  "Dúvidas espirituais",
] as const;

const FAQ = [
  {
    q: "O Amém Chat decide por mim?",
    a: "Não. Ele ajuda a organizar a situação, iluminar com as Escrituras e sugerir próximos passos possíveis. A decisão continua sendo sua.",
  },
  {
    q: "Substitui pastor, padre, igreja ou terapia?",
    a: "Não. É uma ferramenta de reflexão cristã com IA. Não substitui acompanhamento pastoral, comunidade de fé, terapia ou atendimento de emergência.",
  },
  {
    q: "As respostas são iguais para todo mundo?",
    a: "Não. A conversa parte do que você conta — pessoas envolvidas, tentativas anteriores e o que está em jogo — e segue o ritmo da troca.",
  },
  {
    q: "Posso contar detalhes pessoais?",
    a: "Sim, na medida em que se sentir à vontade. O uso das conversas segue a Política de Privacidade. Não há publicação pública do seu diálogo na plataforma.",
  },
  {
    q: "Como funciona a privacidade?",
    a: "Não vendemos seus dados. Prestadores essenciais processam o necessário para operar o serviço. Detalhes estão em /privacidade e /cookies.",
  },
  {
    q: "Quais são os planos?",
    a: "Essencial, Caminho e Profundo — com preços e benefícios definidos no catálogo do produto. O Caminho é a opção recomendada para quem quer voltar com mais constância.",
  },
  {
    q: "Posso cancelar?",
    a: "Sim. Você cancela a renovação automática na sua conta e mantém o acesso até o fim do período já pago.",
  },
  {
    q: "Quando não utilizar?",
    a: "Em emergência, risco à vida, crise grave de saúde mental, questões jurídicas ou clínicas que exijam profissional humano qualificado — busque ajuda adequada imediatamente.",
  },
] as const;

export default function ComecePaidLandingPage() {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <PublicConversionBeacon event="paid_landing_viewed" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pb-2 pt-safe sm:px-6">
        <TrackingLink href="/" className="min-h-11 py-1">
          <span className="font-display text-xl tracking-tight text-ink sm:text-2xl">
            {brand.name}
          </span>
        </TrackingLink>
        <TrackingLink
          href="/entrar"
          className="inline-flex min-h-11 items-center text-sm text-ink-soft transition hover:text-ink"
        >
          Já sou assinante
        </TrackingLink>
      </header>

      <main id="conteudo-principal" tabIndex={-1} className="outline-none">
        <section
          id="comece-hero"
          className="relative overflow-hidden border-b border-border/50"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_8%,rgba(198,160,90,0.22),transparent_44%),radial-gradient(ellipse_at_90%_80%,rgba(107,46,58,0.12),transparent_48%)]"
          />
          <div className="relative mx-auto grid max-w-5xl items-center gap-6 px-4 pb-8 pt-3 sm:px-6 sm:pb-12 sm:pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <div className="animate-fade-up">
              <h1 className="text-balance font-display text-[1.75rem] leading-[1.08] text-ink sm:text-4xl lg:text-[2.75rem]">
                Sua situação não cabe em um vídeo de 30 segundos.
              </h1>
              <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft sm:mt-4 sm:text-lg">
                Conte o que está vivendo e organize seus próximos passos por meio
                de uma conversa guiada pelas Escrituras.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 bg-wine px-5 hover:bg-wine-soft"
                >
                  <PaidLandingScrollCta
                    href="#planos"
                    event="paid_landing_primary_cta_clicked"
                  >
                    Começar agora
                  </PaidLandingScrollCta>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 border-ink/20 px-5"
                >
                  <PaidLandingScrollCta
                    href="#demonstracao"
                    event="paid_landing_demo_clicked"
                  >
                    Ver uma demonstração
                  </PaidLandingScrollCta>
                </Button>
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft sm:text-sm">
                <li>Sem anúncios dentro do produto</li>
                <li aria-hidden className="hidden sm:list-item">
                  ·
                </li>
                <li>Seus dados não são vendidos</li>
                <li aria-hidden className="hidden sm:list-item">
                  ·
                </li>
                <li>IA com limites claros</li>
              </ul>
            </div>
            <div className="animate-fade-up-delayed">
              <PaidLandingMedia />
            </div>
          </div>
        </section>

        <section className="border-b border-border/50 bg-card/40">
          <div
            id="demonstracao"
            className="mx-auto max-w-5xl scroll-mt-6 px-4 py-8 sm:scroll-mt-8 sm:px-6 sm:py-10"
            aria-labelledby="demonstracao-heading"
          >
            <PaidLandingDemo />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            Uma mensagem geral cumpre uma função. Uma conversa contextual cumpre
            outra.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
            Um conteúdo geral não conhece as pessoas envolvidas, os fatos
            anteriores, o que você já tentou, as responsabilidades em jogo nem
            os riscos e consequências concretas da sua situação.
          </p>
        </section>

        <section className="border-y border-border/50 bg-sand-100/60">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Como funciona
            </h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Conte o que está acontecendo",
                  d: "Descreva a situação com as palavras que você já tem.",
                },
                {
                  n: "2",
                  t: "Aprofunde os detalhes importantes",
                  d: "A conversa faz perguntas para entender o que realmente pesa.",
                },
                {
                  n: "3",
                  t: "Organize próximos passos",
                  d: "Receba reflexão, referências bíblicas e caminhos possíveis.",
                },
              ].map((step) => (
                <li key={step.n} className="border-l-2 border-gold/50 pl-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
                    Passo {step.n}
                  </p>
                  <p className="mt-1 font-display text-xl text-ink">{step.t}</p>
                  <p className="mt-1 text-sm text-ink-soft">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            Mensagem geral versus conversa contextual
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Sem atacar igrejas, líderes ou conteúdos cristãos — apenas contrastar
            formatos diferentes de ajuda.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                Mensagem geral
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Inspira, ensina e alcança muitas pessoas ao mesmo tempo. Parte de
                um tema amplo, não do detalhe da sua história.
              </p>
            </div>
            <div className="rounded-2xl border border-gold/40 bg-gradient-to-b from-card to-sand-100/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-wine">
                Conversa contextual
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Parte do que você está vivendo agora, aprofunda o que importa e
                ajuda a organizar o próximo passo possível à luz das Escrituras.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-border/50 bg-card/40">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Situações em que as pessoas costumam conversar
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Exemplos compatíveis com o produto. Sem promessa de solução, cura
              ou decisão correta.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {SITUATIONS.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-sm text-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            O que você encontra na conversa
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Explicar a situação com detalhes, no seu ritmo.",
              "Organizar pensamentos sem pressa artificial.",
              "Refletir com base nas Escrituras e referências.",
              "Retomar o histórico quando voltar.",
              "Aprofundar quando o plano permitir.",
              "Privacidade conforme a política publicada.",
            ].map((item) => (
              <li
                key={item}
                className="border-l-2 border-wine/30 pl-3 text-sm leading-relaxed text-ink-soft"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          id="planos"
          className="scroll-mt-6 border-y border-border/50 bg-sand-100/60 sm:scroll-mt-8"
        >
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Escolha um plano para começar
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">
              Nenhum plano é selecionado automaticamente. O Caminho permanece a
              opção recomendada para quem quer voltar com mais constância.
            </p>
            <div className="mt-6">
              <PaidLandingPlans />
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Cobrança mensal · pagamento seguro · cancele a renovação na sua
              conta. Sem teste gratuito inventado nesta página.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="mt-5 space-y-2">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border/70 bg-card/50 px-4 py-3"
              >
                <summary className="cursor-pointer list-none font-medium text-ink outline-none marker:content-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex min-h-11 items-center justify-between gap-3">
                    {item.q}
                    <span
                      aria-hidden
                      className="text-ink-soft transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="pb-2 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-border/50 bg-ink px-4 py-10 text-sand-50 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl sm:text-3xl">
              Você não precisa encontrar todas as respostas sozinho.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sand-50/80 sm:text-base">
              Comece uma conversa e organize o próximo passo com mais clareza.
            </p>
            <div className="mt-6">
              <Button
                asChild
                size="lg"
                className="min-h-12 bg-sand-50 px-6 text-ink hover:bg-sand-100"
              >
                <PaidLandingScrollCta
                  href="#planos"
                  event="paid_landing_primary_cta_clicked"
                >
                  Começar agora
                </PaidLandingScrollCta>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 text-sm text-ink-soft sm:px-6">
        <TrackingLink href="/privacidade" className="min-h-11 inline-flex items-center hover:text-ink">
          Privacidade
        </TrackingLink>
        <TrackingLink href="/cookies" className="min-h-11 inline-flex items-center hover:text-ink">
          Cookies
        </TrackingLink>
        <TrackingLink href="/termos" className="min-h-11 inline-flex items-center hover:text-ink">
          Termos
        </TrackingLink>
        <TrackingLink href="/ajuda" className="min-h-11 inline-flex items-center hover:text-ink">
          Ajuda
        </TrackingLink>
        <TrackingLink href="/entrar" className="min-h-11 inline-flex items-center hover:text-ink">
          Entrar
        </TrackingLink>
      </footer>

      <PaidLandingMobileCta />
    </div>
  );
}
