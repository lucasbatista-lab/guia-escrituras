import type { Metadata } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ChatDemo } from "@/components/marketing/chat-demo";
import { DeepenComparisonStatic } from "@/components/marketing/deepen-comparison-static";
import { JourneyPreviewStatic } from "@/components/marketing/journey-preview-static";
import { PlanCards, ParticularAccessNote } from "@/components/marketing/plan-cards";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { CROSS_SURFACE_COMMERCIAL_FAQ } from "@/lib/marketing/plan-faq";
import {
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";
import { buildVisitorShareUrl } from "@/lib/share/resolve-server";
import { TRADITION_POLICIES } from "@/lib/theology";
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

const situations = [
  {
    quote: "Tenho contas vencendo e preciso de forças para continuar.",
    note: "Pressão financeira sem culpa mágica — clareza e um passo possível.",
  },
  {
    quote: "Não sei se devo aceitar essa oportunidade.",
    note: "Decisão com luz das Escrituras, sem atalho sobrenatural.",
  },
  {
    quote: "Quero perdoar sem voltar a permitir que me machuquem.",
    note: "Perdão com limites — verdade e cuidado juntos.",
  },
  {
    quote: "Sinto vergonha de repetir o mesmo erro.",
    note: "Recomeço honesto, sem negar consequências.",
  },
  {
    quote: "Meus projetos avançam, mas tenho medo de não prosperar.",
    note: "Trabalho e propósito com serenidade prática.",
  },
  {
    quote: "Parece que Deus está em silêncio.",
    note: "Lamento e presença — sem fingir que está tudo bem.",
  },
  {
    quote: "Estou cansado e não consigo organizar meus pensamentos.",
    note: "Ansiedade acolhida com próximos passos concretos.",
  },
  {
    quote: "Preciso tomar uma decisão no relacionamento.",
    note: "Relação e discernimento com tom cuidadoso.",
  },
];

const pillars = [
  {
    title: "1. Sua situação",
    body: "Você escreve com suas próprias palavras o que está vivendo.",
  },
  {
    title: "2. Escrituras e contexto",
    body: "O Amém Chat busca referências relacionadas ao tema e considera a tradição cristã escolhida.",
  },
  {
    title: "3. Reflexão e próximos passos",
    body: "Você recebe acolhimento, interpretação claramente identificada e sugestões práticas para organizar o próximo passo.",
  },
];

const steps = [
  {
    title: "1. Escolha seu plano",
    body: "Essencial, Caminho ou Profundo — com o que já está disponível hoje.",
  },
  {
    title: "2. Crie sua conta e confirme o e-mail",
    body: "Cadastro com confirmação de e-mail antes do pagamento.",
  },
  {
    title: "3. Conclua o pagamento com segurança",
    body: "Checkout pela Stripe. Renovação mensal, cancelável na sua conta no Amém Chat.",
  },
  {
    title: "4. Personalize a experiência e traga sua situação",
    body: "Escolha tradição e profundidade — depois converse sobre o que pesa agora.",
  },
];

const faq = [
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
        {/* 1. Hero — mobile-first conversion */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(198,160,90,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(74,28,42,0.10),_transparent_50%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-3 sm:px-6 sm:pb-10 sm:pt-6 lg:pb-12 lg:pt-8">
            <div className="animate-fade-up max-w-2xl">
              <h1 className="text-balance font-display text-[1.65rem] leading-[1.18] text-ink sm:text-4xl lg:text-[2.65rem]">
                Leve o que está pesando para uma reflexão à luz das Escrituras.
              </h1>
              <p className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft sm:mt-4 sm:text-lg">
                Conte sua situação e receba referências bíblicas, aplicação
                prática e próximos passos — com inteligência artificial e limites
                claros.
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
                >
                  <a href="#demonstracao">Ver uma conversa de exemplo</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-11 w-full border-ink/20 sm:w-auto"
                >
                  <TrackingLink href="/planos">Ver planos</TrackingLink>
                </Button>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft sm:mt-4">
                {`Planos a partir de ${ESSENCIAL_PRICE_LABEL}/mês · cancele a renovação quando quiser.`}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Demonstração — continuação imediata do hero */}
        <SectionShell tone="card">
          <div
            id="demonstracao"
            className="mx-auto max-w-6xl scroll-mt-6 px-4 py-8 sm:scroll-mt-8 sm:px-6 sm:py-12 lg:py-14"
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
              Veja na prática
            </p>
            <h2
              id="demo-heading"
              className="mt-2 font-display text-2xl text-ink sm:text-3xl"
            >
              Uma conversa de exemplo
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
              Escolha uma situação e veja o tipo de reflexão que o Amém Chat pode
              oferecer.
            </p>
            <div className="mt-5 max-w-2xl sm:mt-6">
              <ChatDemo />
            </div>
          </div>
        </SectionShell>

        {/* 3. Benefícios concretos */}
        <SectionShell>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Como o Amém Chat transforma situação em reflexão
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Do que você vive às Escrituras — com interpretação identificada e
              passos para a vida real.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm"
                >
                  <h3 className="font-display text-xl text-ink">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {pillar.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* 4. Exemplos de situações */}
        <SectionShell tone="sand">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Situações reais que você pode trazer
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Não promete soluções mágicas nem substitui terapia, pastor ou
              ajuda profissional. Oferece clareza, companhia espiritual e um
              próximo passo possível.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {situations.map((item) => (
                <figure
                  key={item.quote}
                  className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm"
                >
                  <blockquote className="font-display text-lg leading-snug text-ink">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {item.note}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* 5. Como funciona em quatro passos */}
        <SectionShell>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Como começar
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Do plano à primeira conversa, em passos claros.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-border/60 bg-card/50 p-5"
                >
                  <h3 className="font-display text-xl text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Button asChild size="lg" variant="outline" className="min-h-11">
                <TrackingLink href="/planos">Conhecer os planos</TrackingLink>
              </Button>
            </div>
          </div>
        </SectionShell>

        {/* 6. Tradições */}
        <SectionShell tone="card">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Tradições cristãs no perfil
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Você escolhe a tradição que molda como a reflexão é apresentada —
              não apenas o tom.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {TRADITION_POLICIES.map((tradition) => (
                <div
                  key={tradition.key}
                  className="rounded-2xl border border-border/70 bg-card/60 p-5"
                >
                  <h3 className="font-display text-xl text-ink">
                    {tradition.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {tradition.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* 7. Três planos */}
        <SectionShell>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Planos
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Assinatura mensal a partir de {ESSENCIAL_PRICE_LABEL}/mês.
              Essencial para começar com reflexões e histórico. Caminho acrescenta
              Jornadas guiadas e continuidade. Profundo inclui Aprofundar sob
              demanda para situações que pedem mais detalhe — sem trocar o
              Essencial por culpa ou pressão.
            </p>
            <div className="mt-10">
              <PlanCards compact />
            </div>
            <ParticularAccessNote className="mt-8" />
            <p className="mt-6">
              <TrackingLink
                href="/planos"
                className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
              >
                Comparar todos os planos
              </TrackingLink>
            </p>
          </div>
        </SectionShell>

        {/* 8. Preview real de Jornada */}
        <SectionShell tone="sand">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <JourneyPreviewStatic />
          </div>
        </SectionShell>

        {/* 9. Normal versus Aprofundar */}
        <SectionShell>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <DeepenComparisonStatic />
          </div>
        </SectionShell>

        {/* 10. Confiança e limites */}
        <SectionShell tone="card">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Segurança, privacidade e limites
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              O Amém Chat é inteligência artificial baseada nas Escrituras. Não
              afirma ser Jesus, Deus ou revelação. Não substitui liderança
              pastoral, terapia ou atendimento de emergência. Detalhes em{" "}
              <TrackingLink
                href="/transparencia-ia"
                className="text-ink underline underline-offset-4"
              >
                Transparência sobre IA
              </TrackingLink>
              .
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Baseado nas Escrituras
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Tradição ecumênica, evangélica ou católica
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Pagamento processado pela Stripe
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Renovação cancelável na sua conta — veja{" "}
                <TrackingLink
                  href="/cancelamento"
                  className="text-ink underline underline-offset-4"
                >
                  cancelamento
                </TrackingLink>
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Conversas privadas conforme a Política de Privacidade
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Referências bíblicas apresentadas por síntese
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Escolha de tradição cristã no perfil
              </li>
              <li className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                Sem pressão de doação ou culpa na conversa
              </li>
            </ul>
          </div>
        </SectionShell>

        {/* 11. FAQ */}
        <SectionShell tone="sand">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Perguntas frequentes
            </h2>
            <div className="mt-8 space-y-6">
              {faq.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-border/60 bg-card/70 px-5 py-5 shadow-sm"
                >
                  <h3 className="font-medium text-ink">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* 12. CTA final */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6">
          <div className="rounded-3xl border border-wine/20 bg-gradient-to-br from-wine/[0.06] to-card px-6 py-12 text-center sm:px-10">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Pronto para escolher um plano?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              Compare Essencial, Caminho e Profundo, confirme o e-mail e comece a
              conversar com a tradição que faz sentido para você — a partir de{" "}
              {ESSENCIAL_PRICE_LABEL}/mês. O produto evolui com honestidade: o
              que você contrata hoje está claro nos planos.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="min-h-11 w-full bg-wine hover:bg-wine-soft sm:w-auto"
              >
                <TrackingLink href="/planos">Ver planos</TrackingLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <a href="#demonstracao">Ver um exemplo</a>
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
