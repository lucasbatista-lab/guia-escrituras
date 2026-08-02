import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { PaidLandingContinuity } from "@/components/marketing/paid-landing/paid-landing-continuity";
import { PaidLandingDemo } from "@/components/marketing/paid-landing/paid-landing-demo";
import { PaidLandingMedia } from "@/components/marketing/paid-landing/paid-landing-media";
import { PaidLandingMobileCta } from "@/components/marketing/paid-landing/paid-landing-mobile-cta";
import { PaidLandingPlans } from "@/components/marketing/paid-landing/paid-landing-plans";
import {
  PaidLandingScrollCta,
} from "@/components/marketing/paid-landing/paid-landing-scroll-cta";
import { PaidLandingSectionView } from "@/components/marketing/paid-landing/paid-landing-section-view";
import {
  ConversationEyebrow,
  PaidLandingSection,
} from "@/components/marketing/paid-landing/conversation-language";
import { PublicConversionBeacon } from "@/components/marketing/public-conversion-beacon";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import {
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";

const PAGE_TITLE = "Reflexões cristãs para situações reais";
const PAGE_DESCRIPTION =
  "Conte sua situação. O Amém Chat faz perguntas, organiza o contexto e traz referências bíblicas e próximos passos possíveis — sem decidir por você.";

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

const FAQ = [
  {
    q: "O Amém Chat decide por mim?",
    a: "Não. Ele organiza a situação, ilumina com as Escrituras e sugere próximos passos possíveis. A decisão continua sendo sua.",
  },
  {
    q: "Substitui pastor, padre, terapia ou atendimento de emergência?",
    a: "Não. É uma ferramenta de reflexão cristã com IA — não substitui pastor, padre, terapia ou emergência.",
  },
  {
    q: "O Amém Chat é apenas um ChatGPT cristão?",
    a: "Não. Foi feito para reflexão cristã: perguntas, referências bíblicas, limites, personalização, Histórico, Jornadas e Aprofundar conforme o plano.",
  },
  {
    q: "Posso cancelar?",
    a: "Sim. Cancele a renovação na sua Conta e mantenha o acesso até o fim do período já pago.",
  },
] as const;

const TRUST_PILLARS = [
  {
    title: "Privacidade",
    body: "Conversas não são públicas e seus dados não são vendidos.",
  },
  {
    title: "Limites",
    body: "A IA ajuda a refletir; não substitui pastor, padre, terapia ou emergência.",
  },
  {
    title: "Controle",
    body: "Você escolhe o plano e pode cancelar a renovação pela Conta.",
  },
] as const;

export default function ComecePaidLandingPage() {
  return (
    <div className="min-h-screen pb-[calc(3.25rem+var(--safe-bottom))] md:pb-0">
      <noscript>
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
            Reflexões cristãs para situações reais
          </p>
          <p className="mt-2 font-display text-2xl">
            O que você está vivendo merece mais do que uma resposta genérica.
          </p>
          <p className="mt-2 text-ink-soft">
            Conte sua situação. O Amém Chat faz perguntas, organiza o contexto e
            traz referências bíblicas e próximos passos possíveis — sem decidir
            por você.
          </p>
          <p className="mt-2 text-ink-soft">
            A partir de R$38/mês · cobrança mensal · cancele a renovação pela
            Conta.
          </p>
          <p className="mt-4">
            <a className="underline" href="#planos">
              Escolher meu plano
            </a>
            {" · "}
            <a className="underline" href="#demonstracao">
              Ver uma conversa de exemplo
            </a>
            {" · "}
            <a className="underline" href="/cadastro?plan=caminho">
              Criar conta no Caminho
            </a>
          </p>
        </div>
      </noscript>
      <PublicConversionBeacon event="paid_landing_viewed" />
      <PaidLandingSectionView event="paid_landing_demo_viewed" targetId="demonstracao" />
      <PaidLandingSectionView event="paid_landing_plans_viewed" targetId="planos" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pb-0.5 pt-safe sm:px-6">
        <TrackingLink href="/" className="min-h-11 py-1">
          <span className="font-display text-lg tracking-tight text-ink sm:text-2xl">
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
          className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-sand-100/80 via-sand-50 to-sand-50"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_8%,rgba(198,160,90,0.28),transparent_40%),radial-gradient(ellipse_at_0%_100%,rgba(107,46,58,0.14),transparent_48%)]"
          />
          <div className="relative mx-auto grid max-w-5xl items-start gap-3 px-4 pb-5 pt-1.5 sm:gap-6 sm:px-6 sm:pb-10 sm:pt-4 lg:grid-cols-[0.42fr_0.58fr] lg:items-center lg:gap-8">
            <div className="animate-fade-up">
              <ConversationEyebrow className="mb-1">
                Reflexões cristãs para situações reais
              </ConversationEyebrow>
              <h1 className="text-balance font-display text-[1.32rem] leading-[1.1] text-ink sm:text-4xl lg:text-[2.45rem]">
                O que você está vivendo merece mais do que uma resposta
                genérica.
              </h1>
              <p className="mt-1.5 max-w-md text-[0.875rem] leading-snug text-ink-soft sm:mt-3 sm:max-w-xl sm:text-lg sm:leading-relaxed">
                Conte sua situação. O Amém Chat faz perguntas, organiza o
                contexto e traz referências bíblicas e próximos passos possíveis
                — sem decidir por você.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-h-11 bg-wine px-5 shadow-[0_12px_28px_-16px_rgba(107,46,58,0.75)] hover:bg-wine-soft sm:min-h-12"
                >
                  <PaidLandingScrollCta
                    href="#planos"
                    event="paid_landing_primary_cta_clicked"
                  >
                    Escolher meu plano
                  </PaidLandingScrollCta>
                </Button>
                <PaidLandingScrollCta
                  href="#demonstracao"
                  event="paid_landing_demo_clicked"
                  className="inline-flex min-h-11 items-center justify-center px-1 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline sm:min-h-12"
                >
                  Ver uma conversa de exemplo
                </PaidLandingScrollCta>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-ink-soft sm:mt-3 sm:text-sm">
                A partir de R$38/mês · cobrança mensal · cancele a renovação
                pela Conta.
              </p>
              <p className="mt-1 text-[11px] text-ink-soft sm:text-sm">
                Conversas privadas · dados não vendidos · IA com limites claros
              </p>
            </div>
            <div className="animate-fade-up-delayed min-w-0">
              <PaidLandingMedia
                priority
                className="mx-auto w-full max-w-[22rem] lg:max-w-none"
              />
            </div>
          </div>
        </section>

        <section className="relative border-b border-border/40 bg-sand-50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sand-100/70 to-transparent"
          />
          <div
            id="demonstracao"
            className="relative mx-auto max-w-5xl scroll-mt-6 px-4 py-6 sm:scroll-mt-8 sm:px-6 sm:py-8"
            aria-labelledby="demonstracao-heading"
          >
            <PaidLandingDemo />
          </div>
        </section>

        <PaidLandingContinuity />

        <section
          id="planos"
          className="scroll-mt-6 border-y border-border/40 bg-sand-100/50 sm:scroll-mt-8"
        >
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <ConversationEyebrow>Oferta</ConversationEyebrow>
            <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
              Escolha o plano da sua reflexão.
            </h2>
            <div className="mt-4">
              <PaidLandingPlans />
            </div>
          </div>
        </section>

        <PaidLandingSection
          id="confianca"
          eyebrow="Confiança"
          title="Clareza sem ultrapassar limites."
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {TRUST_PILLARS.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-border/60 bg-card/40 px-3 py-3"
              >
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-soft">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </PaidLandingSection>

        <PaidLandingSection eyebrow="Dúvidas" title="Perguntas frequentes">
          <div className="space-y-1.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group border-b border-border/50 px-0.5 py-1.5"
              >
                <summary className="cursor-pointer list-none font-medium text-ink outline-none marker:content-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex min-h-11 items-center justify-between gap-3 text-[0.95rem]">
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
          <p className="mt-3 text-sm text-ink-soft">
            <TrackingLink
              href="/ajuda"
              className="underline underline-offset-4 hover:text-ink"
            >
              Ver todas as dúvidas
            </TrackingLink>
          </p>
        </PaidLandingSection>

        <section
          id="comece-final-cta"
          className="relative overflow-hidden border-t border-border/50 bg-ink px-4 py-8 text-sand-50 sm:px-6 sm:py-9"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(198,160,90,0.2),transparent_48%),radial-gradient(ellipse_at_80%_100%,rgba(107,46,58,0.4),transparent_50%)]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl sm:text-3xl">
              Sua situação tem detalhes. Sua reflexão também pode ter.
            </h2>
            <div className="mt-5">
              <Button
                asChild
                size="lg"
                className="min-h-12 bg-sand-50 px-6 text-ink shadow-[0_14px_32px_-18px_rgba(251,248,243,0.55)] hover:bg-sand-100"
              >
                <PaidLandingScrollCta
                  href="#planos"
                  event="paid_landing_primary_cta_clicked"
                >
                  Escolher meu plano
                </PaidLandingScrollCta>
              </Button>
            </div>
            <p className="mt-3 text-xs text-sand-50/65">
              A partir de R$38/mês · cobrança mensal · cancele pela Conta
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-sm text-ink-soft sm:px-6">
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
