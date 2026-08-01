import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { PaidLandingDemo } from "@/components/marketing/paid-landing/paid-landing-demo";
import { PaidLandingMedia } from "@/components/marketing/paid-landing/paid-landing-media";
import { PaidLandingMobileCta } from "@/components/marketing/paid-landing/paid-landing-mobile-cta";
import { PaidLandingPlans } from "@/components/marketing/paid-landing/paid-landing-plans";
import {
  PaidLandingScrollCta,
} from "@/components/marketing/paid-landing/paid-landing-scroll-cta";
import { PaidLandingSectionView } from "@/components/marketing/paid-landing/paid-landing-section-view";
import {
  ContinuitySurface,
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
    q: "Como funciona a privacidade?",
    a: "Não vendemos seus dados. Conversas não são públicas na plataforma. Prestadores essenciais processam o necessário para operar o serviço. Detalhes em /privacidade e /cookies.",
  },
  {
    q: "Posso cancelar?",
    a: "Sim. Você cancela a renovação automática na sua conta e mantém o acesso até o fim do período já pago. O pagamento é processado com segurança pela Stripe.",
  },
  {
    q: "Quando não utilizar?",
    a: "Em emergência, risco à vida, crise grave de saúde mental, questões jurídicas ou clínicas que exijam profissional humano qualificado — busque ajuda adequada imediatamente.",
  },
] as const;

export default function ComecePaidLandingPage() {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <noscript>
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink">
          <p className="font-display text-2xl">
            Sua situação não cabe em um vídeo de 30 segundos.
          </p>
          <p className="mt-2 text-ink-soft">
            O Amém Chat oferece uma conversa guiada pelas Escrituras para
            organizar próximos passos.
          </p>
          <p className="mt-4">
            <a className="underline" href="#planos">
              Ver planos
            </a>
            {" · "}
            <a className="underline" href="#demonstracao">
              Ver a demonstração
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

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pb-1 pt-safe sm:px-6">
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
          className="relative overflow-hidden border-b border-border/40"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_12%,rgba(198,160,90,0.2),transparent_42%),radial-gradient(ellipse_at_8%_88%,rgba(107,46,58,0.1),transparent_46%)]"
          />
          <div className="relative mx-auto grid max-w-5xl items-start gap-3 px-4 pb-5 pt-2 sm:gap-6 sm:px-6 sm:pb-10 sm:pt-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10">
            <div className="animate-fade-up">
              <ConversationEyebrow className="mb-1.5 hidden sm:block">
                A conversa que continua
              </ConversationEyebrow>
              <h1 className="text-balance font-display text-[1.45rem] leading-[1.08] text-ink sm:text-4xl lg:text-[2.65rem]">
                Sua situação não cabe em um vídeo de 30 segundos.
              </h1>
              <p className="mt-2 max-w-xl text-[0.9rem] leading-snug text-ink-soft sm:mt-3 sm:text-lg sm:leading-relaxed">
                Conte o que está vivendo e organize seus próximos passos por meio
                de uma conversa guiada pelas Escrituras.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-h-11 bg-wine px-5 hover:bg-wine-soft sm:min-h-12"
                >
                  <PaidLandingScrollCta
                    href="#planos"
                    event="paid_landing_primary_cta_clicked"
                  >
                    Ver planos
                  </PaidLandingScrollCta>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-11 border-ink/20 px-5 sm:min-h-12"
                >
                  <PaidLandingScrollCta
                    href="#demonstracao"
                    event="paid_landing_demo_clicked"
                  >
                    Ver a demonstração
                  </PaidLandingScrollCta>
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-ink-soft sm:mt-3 sm:text-sm">
                Privado · sem anúncios no produto · IA com limites claros
              </p>
            </div>
            <div className="animate-fade-up-delayed">
              <PaidLandingMedia
                priority
                className="mx-auto w-full max-w-[24rem] lg:max-w-none"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border/40">
          <div
            id="demonstracao"
            className="mx-auto max-w-5xl scroll-mt-6 px-4 py-8 sm:scroll-mt-8 sm:px-6 sm:py-10"
            aria-labelledby="demonstracao-heading"
          >
            <PaidLandingDemo />
          </div>
        </section>

        <PaidLandingSection
          eyebrow="Mecanismo"
          title="Três movimentos da conversa"
          description="Uma mensagem geral inspira muitas pessoas ao mesmo tempo. Uma conversa contextual parte da sua história."
          tone="soft"
        >
          <ol className="relative space-y-0">
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-3 left-[11px] top-3 w-px bg-gradient-to-b from-gold/50 via-wine/20 to-gold/40"
            />
            {[
              {
                n: "1",
                t: "Conte o contexto",
                d: "Descreva a situação com as palavras que você já tem — fatos, pessoas e o que pesa agora.",
              },
              {
                n: "2",
                t: "Aprofunde o que importa",
                d: "A conversa faz perguntas para separar medo, responsabilidade e o que realmente está em jogo.",
              },
              {
                n: "3",
                t: "Organize próximos passos",
                d: "Receba reflexão, referências bíblicas e caminhos possíveis — a decisão continua sendo sua.",
              },
            ].map((step) => (
              <li key={step.n} className="relative pl-9 pb-5 last:pb-0 sm:pl-10">
                <span
                  aria-hidden
                  className="absolute left-0 top-1 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 text-[10px] font-medium text-wine sm:size-[27px] sm:text-[11px]"
                >
                  {step.n}
                </span>
                <p className="font-display text-xl text-ink">{step.t}</p>
                <p className="mt-1 max-w-2xl text-sm text-ink-soft">{step.d}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-6 flex flex-wrap gap-2">
            {SITUATIONS.map((item) => (
              <li
                key={item}
                className="rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-ink"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Temas que as pessoas podem explorar — sem promessa de solução, cura
            ou decisão correta.
          </p>
        </PaidLandingSection>

        <PaidLandingSection
          eyebrow="Continuidade"
          title="A conversa não termina no primeiro dia"
          description="O plano muda a profundidade e a continuidade da experiência — não a seriedade da orientação."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <ContinuitySurface
              active
              title="Hoje"
              detail="Conte sua situação, receba perguntas e organize um próximo passo possível."
            />
            <ContinuitySurface
              title="Quando voltar"
              detail="Retome no Histórico, esclareça o que mudou e continue a mesma linha."
            />
            <ContinuitySurface
              title="Ao longo do uso"
              detail="Jornadas e Aprofundar conforme o plano — para quem precisa de mais constância ou análise."
            />
          </div>
          <ul className="mt-5 space-y-2 text-sm leading-relaxed text-ink-soft">
            <li>Personalização no perfil (tradição e preferências).</li>
            <li>Histórico privado para retomar o fio.</li>
            <li>Jornadas guiadas e Aprofundar nos planos em que estão disponíveis.</li>
          </ul>
        </PaidLandingSection>

        <PaidLandingSection
          eyebrow="Confiança"
          title="Privacidade e limites claros"
          description="Construído para reflexão séria — sem explorar vulnerabilidade e sem fingir o que a IA não é."
          tone="soft"
        >
          <ul className="grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
            {[
              "Sem anúncios dentro do produto",
              "Seus dados não são vendidos",
              "Conversas não são públicas na plataforma",
              "IA com limites claros — não substitui pastor, padre, terapia ou emergência",
              "Pagamento seguro com Stripe na assinatura",
              "Cancele a renovação pela sua conta",
            ].map((item) => (
              <li
                key={item}
                className="border-l-2 border-wine/30 pl-3 leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        </PaidLandingSection>

        <section
          id="planos"
          className="scroll-mt-6 border-y border-border/40 bg-sand-100/45 sm:scroll-mt-8"
        >
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
            <ConversationEyebrow>Planos</ConversationEyebrow>
            <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
              Escolha a continuidade que faz sentido agora
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">
              O plano muda a profundidade e a continuidade da experiência — não a
              seriedade da orientação. Nenhum plano é selecionado automaticamente.
              O Caminho é a opção recomendada para quem quer voltar com mais
              constância.
            </p>
            <div className="mt-6">
              <PaidLandingPlans />
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Cobrança mensal · pagamento seguro com Stripe · cancele a renovação
              na sua conta.
            </p>
          </div>
        </section>

        <PaidLandingSection
          eyebrow="Dúvidas"
          title="Perguntas frequentes"
        >
          <div className="space-y-2">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border/60 bg-card/40 px-4 py-3"
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
        </PaidLandingSection>

        <section
          id="comece-final-cta"
          className="border-t border-border/50 bg-ink px-4 py-10 text-sand-50 sm:px-6 sm:py-12"
        >
          <div className="mx-auto max-w-3xl text-center">
            <ConversationEyebrow className="text-center text-gold-soft">
              Próximo passo
            </ConversationEyebrow>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl">
              Você não precisa encontrar todas as respostas sozinho.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sand-50/80 sm:text-base">
              Escolha um plano e continue a conversa com mais clareza — no seu
              ritmo.
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
                  Ver planos
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
