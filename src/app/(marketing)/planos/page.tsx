import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import {
  ParticularAccessNote,
  PlanCards,
} from "@/components/marketing/plan-cards";
import { DeepenComparisonStatic } from "@/components/marketing/deepen-comparison-static";
import { JourneyPreviewStatic } from "@/components/marketing/journey-preview-static";
import { PlanCompareStatic } from "@/components/marketing/plan-compare-static";
import { PlanComparisonViewBeacon } from "@/components/marketing/plan-comparison-view-beacon";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth/session";
import { isActiveSubscription } from "@/lib/billing";
import {
  PLAN_ROADMAP_ITEMS,
  SHARED_PLAN_INCLUDES,
} from "@/lib/marketing/plan-public-copy";
import { PLAN_COMMERCIAL_FAQ } from "@/lib/marketing/plan-faq";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Planos",
  description:
    "Compare Essencial, Caminho e Profundo: uso pontual, constância com Jornadas ou análises adicionais com Aprofundar. A partir de R$ 38/mês.",
  path: "/planos",
});

const CHOOSE_IN_30S = [
  {
    prompt: "Quero conversar quando surgir uma situação",
    plan: "Essencial",
    planKey: "essencial" as const,
    note: "Chat completo para momentos pontuais, com histórico e personalização.",
    highlighted: false,
  },
  {
    prompt: "Quero criar constância e seguir Jornadas",
    plan: "Caminho",
    planKey: "caminho" as const,
    note: "Melhor equilíbrio entre uso e acompanhamento — trilhas de 7 etapas + chat.",
    highlighted: true,
  },
  {
    prompt: "Quero um segundo nível de análise para temas complexos",
    plan: "Profundo",
    planKey: "profundo" as const,
    note: "Tudo do Caminho, com Aprofundar sob demanda quando a situação pedir mais detalhe.",
    highlighted: false,
  },
] as const;

export default async function PlanosPage() {
  const auth = await getAuthUserContext();
  const hasActiveSubscription = Boolean(
    auth?.planKey &&
      auth.subscriptionStatus &&
      isActiveSubscription(
        auth.subscriptionStatus as Parameters<typeof isActiveSubscription>[0],
      ),
  );

  return (
    <div className="min-h-screen">
      <PlanComparisonViewBeacon />
      <SiteHeader />
      <main id="conteudo-principal" tabIndex={-1} className="outline-none">
        {/* 1–2. Hero */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(198,160,90,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(74,28,42,0.08),_transparent_50%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
            <header className="max-w-2xl">
              <h1 className="font-display text-4xl text-ink sm:text-5xl">
                Escolha o ritmo da sua reflexão
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
                Todos os planos incluem o chat. O que muda é a constância, o
                acesso às Jornadas e a possibilidade de Aprofundar temas
                complexos.
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                Assinatura mensal com renovação automática · a partir de R$
                38/mês · cancele a renovação quando quiser.
              </p>
            </header>

            {hasActiveSubscription ? (
              <p className="mt-6 max-w-2xl rounded-lg border border-border/70 bg-sand-100/60 px-4 py-3 text-sm text-ink-soft">
                Você já possui uma assinatura ativa. Para gerenciar renovação ou
                cancelamento, acesse{" "}
                <TrackingLink
                  href="/conta"
                  className="text-ink underline underline-offset-4"
                >
                  sua conta
                </TrackingLink>
                . A troca automática entre planos ainda não está disponível —
                use esta página para comparar e avisaremos na conta quando
                estiver pronta.
              </p>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          {/* 3–4. Três cards + Caminho destacado */}
          <section aria-labelledby="planos-cards-heading">
            <h2 id="planos-cards-heading" className="sr-only">
              Essencial, Caminho e Profundo
            </h2>
            <PlanCards
              currentPlanKey={
                hasActiveSubscription ? auth?.planKey ?? null : null
              }
              hasActiveSubscription={hasActiveSubscription}
            />
            <p className="mt-6 max-w-2xl rounded-xl border border-gold/30 bg-sand-100/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">
                Caminho — melhor equilíbrio entre uso e acompanhamento.
              </span>{" "}
              Para quem quer voltar na semana e seguir uma trilha, sem precisar
              do Aprofundar em toda conversa.
            </p>
          </section>

          {/* 5. Como escolher em 30 segundos */}
          <section
            id="comparar-uso"
            className="mt-16 scroll-mt-24"
            aria-labelledby="comparar-uso-heading"
          >
            <h2
              id="comparar-uso-heading"
              className="font-display text-3xl text-ink sm:text-4xl"
            >
              Como escolher em 30 segundos
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Sem quiz. Leia a frase que mais parece com você — dentro da{" "}
              <TrackingLink
                href="/uso-justo"
                className="text-ink underline underline-offset-4"
              >
                política de uso justo
              </TrackingLink>
              .
            </p>
            <ul className="mt-8 grid gap-4">
              {CHOOSE_IN_30S.map((item) => (
                <li
                  key={item.planKey}
                  className={
                    item.highlighted
                      ? "rounded-2xl border border-gold/40 bg-card/80 p-5 ring-1 ring-gold/25"
                      : "rounded-2xl border border-border/70 bg-card/60 p-5"
                  }
                >
                  <p className="font-display text-lg leading-snug text-ink">
                    “{item.prompt}”
                  </p>
                  <p className="mt-3 text-sm font-medium text-ink">
                    → {item.plan}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {item.note}
                  </p>
                  {!hasActiveSubscription ? (
                    <p className="mt-4">
                      <TrackingLink
                        href={`/cadastro?plan=${item.planKey}`}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
                      >
                        Ir para o {item.plan}
                      </TrackingLink>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {/* 6. Preview da Jornada */}
          <div className="mt-16">
            <JourneyPreviewStatic />
          </div>

          {/* 7. Normal versus Aprofundar */}
          <div id="aprofundar" className="mt-16 scroll-mt-24">
            <DeepenComparisonStatic />
          </div>

          {/* 8. Comparação detalhada mobile-first */}
          <div className="mt-16">
            <PlanCompareStatic />
          </div>

          {/* Shared includes */}
          <section
            className="mt-16 max-w-2xl"
            aria-labelledby="todos-planos-heading"
          >
            <h2
              id="todos-planos-heading"
              className="font-display text-2xl text-ink"
            >
              O que todos os planos incluem
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              {SHARED_PLAN_INCLUDES.map((item) => (
                <li key={item} className="flex gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine/70"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 9. Confiança */}
          <section
            className="mt-16 max-w-2xl"
            aria-labelledby="confianca-heading"
          >
            <h2 id="confianca-heading" className="font-display text-2xl text-ink">
              Cobrança, renovação e cancelamento
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
              <li>
                · Assinatura mensal — Essencial R$ 38 · Caminho R$ 58 · Profundo
                R$ 188
              </li>
              <li>· Checkout seguro processado pela Stripe</li>
              <li>
                · Renovação automática;{" "}
                <TrackingLink
                  href="/cancelamento"
                  className="text-ink underline underline-offset-4"
                >
                  cancelamento da renovação
                </TrackingLink>{" "}
                pela sua conta, com acesso até o fim do período pago
              </li>
              <li>
                · A troca automática entre planos ainda não está disponível
              </li>
              <li>
                ·{" "}
                <TrackingLink
                  href="/transparencia-ia"
                  className="text-ink underline underline-offset-4"
                >
                  Transparência sobre IA
                </TrackingLink>{" "}
                — limites honestos, sem voz divina
              </li>
            </ul>
          </section>

          {/* Particular — after main offer, not in grid */}
          <ParticularAccessNote className="mt-14" />

          {/* 10–11. FAQ comercial */}
          <section
            className="mt-16 max-w-2xl"
            aria-labelledby="planos-faq-heading"
          >
            <h2 id="planos-faq-heading" className="font-display text-2xl text-ink">
              Perguntas frequentes
            </h2>
            <div className="mt-6 space-y-5">
              {PLAN_COMMERCIAL_FAQ.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-ink">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Roadmap — trust footer, not competing with price */}
          <section
            className="mt-14 max-w-2xl border-t border-border/50 pt-10"
            aria-labelledby="roadmap-heading"
          >
            <h2 id="roadmap-heading" className="font-display text-xl text-ink">
              Em evolução — não faz parte do que você está contratando hoje
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Itens abaixo são possíveis caminhos futuros. Não justificam o preço
              atual e não confundem com as Jornadas já disponíveis no Caminho e no
              Profundo.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              {PLAN_ROADMAP_ITEMS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 12. CTA final — Caminho first */}
          <section
            className="mt-16 rounded-3xl border border-wine/20 bg-gradient-to-br from-wine/[0.06] to-card px-6 py-12 text-center sm:px-10"
            aria-labelledby="planos-cta-heading"
          >
            <h2
              id="planos-cta-heading"
              className="font-display text-3xl text-ink sm:text-4xl"
            >
              Comece pelo equilíbrio
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              O Caminho é a escolha natural para constância com Jornadas. Se
              preferir só o pontual ou já precisa de Aprofundar, Essencial e
              Profundo continuam disponíveis.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                asChild
                size="lg"
                className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
              >
                <TrackingLink href="/cadastro?plan=caminho">
                  Escolher o Caminho
                </TrackingLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <TrackingLink href="/cadastro?plan=essencial">
                  Começar com o Essencial
                </TrackingLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <TrackingLink href="/cadastro?plan=profundo">
                  Quero o Profundo
                </TrackingLink>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
