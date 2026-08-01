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

const PAGE_TITLE = "Comece uma conversa guiada pelas Escrituras";
const PAGE_DESCRIPTION =
  "Conte o que está vivendo e organize o próximo passo com uma conversa guiada pelas Escrituras — com continuidade, privacidade e limites claros de IA.";

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
    a: "Não. É uma experiência cristã estruturada, com regras e limites, referências bíblicas, personalização, Histórico, Jornadas e Aprofundar conforme o plano — e conversas privadas.",
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
    title: "Limites honestos",
    body: "A IA ajuda a refletir; não substitui pastor, padre, terapia ou emergência.",
  },
  {
    title: "Controle",
    body: "Cancele a renovação pela sua Conta.",
  },
] as const;

export default function ComecePaidLandingPage() {
  return (
    <div className="min-h-screen pb-[calc(3.25rem+var(--safe-bottom))] md:pb-0">
      <noscript>
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink">
          <p className="font-display text-2xl">
            Sua situação não cabe em um vídeo de 30 segundos.
          </p>
          <p className="mt-2 text-ink-soft">
            Conte o que está vivendo. Organize o próximo passo com uma conversa
            guiada pelas Escrituras.
          </p>
          <p className="mt-2 text-ink-soft">
            Planos a partir de R$38/mês. Cancele a renovação pela sua Conta.
          </p>
          <p className="mt-4">
            <a className="underline" href="#demonstracao">
              Ver como funciona
            </a>
            {" · "}
            <a className="underline" href="#planos">
              Ver planos
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
          className="relative overflow-hidden border-b border-border/40"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_12%,rgba(198,160,90,0.2),transparent_42%),radial-gradient(ellipse_at_8%_88%,rgba(107,46,58,0.1),transparent_46%)]"
          />
          <div className="relative mx-auto grid max-w-5xl items-start gap-2.5 px-4 pb-4 pt-1.5 sm:gap-6 sm:px-6 sm:pb-10 sm:pt-4 lg:grid-cols-[0.4fr_0.6fr] lg:items-center lg:gap-8">
            <div className="animate-fade-up">
              <ConversationEyebrow className="mb-1">
                A conversa que continua
              </ConversationEyebrow>
              <h1 className="text-balance font-display text-[1.35rem] leading-[1.08] text-ink sm:text-4xl lg:text-[2.55rem]">
                Sua situação não cabe em um vídeo de 30 segundos.
              </h1>
              <p className="mt-1.5 max-w-md text-[0.875rem] leading-snug text-ink-soft sm:mt-3 sm:max-w-xl sm:text-lg sm:leading-relaxed">
                Conte o que está vivendo. Organize o próximo passo com uma
                conversa guiada pelas Escrituras.
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-h-11 bg-wine px-5 hover:bg-wine-soft sm:min-h-12"
                >
                  <PaidLandingScrollCta
                    href="#demonstracao"
                    event="paid_landing_demo_clicked"
                  >
                    Ver como funciona
                  </PaidLandingScrollCta>
                </Button>
                <PaidLandingScrollCta
                  href="#planos"
                  event="paid_landing_primary_cta_clicked"
                  className="inline-flex min-h-11 items-center justify-center px-1 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline sm:min-h-12"
                >
                  Ver planos
                </PaidLandingScrollCta>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-ink-soft sm:mt-3 sm:text-sm">
                Planos a partir de R$38/mês. Cancele a renovação pela sua Conta.
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

        <section className="border-b border-border/40">
          <div
            id="demonstracao"
            className="mx-auto max-w-5xl scroll-mt-6 px-4 py-6 sm:scroll-mt-8 sm:px-6 sm:py-9"
            aria-labelledby="demonstracao-heading"
          >
            <PaidLandingDemo />
          </div>
        </section>

        <PaidLandingContinuity />

        <PaidLandingSection
          eyebrow="Confiança"
          title="Privacidade e limites claros"
          tone="soft"
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {TRUST_PILLARS.map((item) => (
              <li
                key={item.title}
                className="border-l-2 border-wine/30 pl-3"
              >
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-soft">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </PaidLandingSection>

        <section
          id="planos"
          className="scroll-mt-6 border-y border-border/40 bg-sand-100/45 sm:scroll-mt-8"
        >
          <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
            <ConversationEyebrow>Planos</ConversationEyebrow>
            <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
              Escolha quanto de continuidade você precisa.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">
              O Caminho é recomendado para quem quer voltar com mais constância.
            </p>
            <div className="mt-5">
              <PaidLandingPlans />
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Cobrança mensal segura com Stripe · cancele a renovação na sua
              Conta.
            </p>
          </div>
        </section>

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
          className="border-t border-border/50 bg-ink px-4 py-8 text-sand-50 sm:px-6 sm:py-10"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl sm:text-3xl">
              Sua situação tem detalhes. Sua reflexão também pode ter.
            </h2>
            <div className="mt-5">
              <Button
                asChild
                size="lg"
                className="min-h-12 bg-sand-50 px-6 text-ink hover:bg-sand-100"
              >
                <PaidLandingScrollCta
                  href="#planos"
                  event="paid_landing_primary_cta_clicked"
                >
                  Escolher um plano
                </PaidLandingScrollCta>
              </Button>
            </div>
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
