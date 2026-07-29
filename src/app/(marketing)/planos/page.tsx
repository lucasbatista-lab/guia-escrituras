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
import { TrustPrinciples } from "@/components/marketing/trust-principles";
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
          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
            <header className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
                Assinatura mensal · acesso na mesma conta
              </p>
              <h1 className="mt-2 text-balance font-display text-4xl leading-tight text-ink sm:text-5xl">
                Escolha quanto espaço você quer para voltar
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
                Todos incluem conversa personalizada e histórico. O que muda é a
                frequência, o acesso às Jornadas e a possibilidade de Aprofundar.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-ink-soft">
                {["A partir de R$ 38/mês", "Celular e computador", "Sem teste gratuito", "Renovação cancelável"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border/70 bg-card/70 px-3 py-1.5"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
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
          {/* 3–4. Decision-oriented cards */}
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
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">
                Por que o Caminho está em destaque?
              </span>{" "}
              É o equilíbrio oficial para quem quer voltar durante a semana e
              seguir Jornadas, sem precisar do Aprofundar. Todos os planos seguem
              a{" "}
              <TrackingLink
                href="/uso-justo"
                className="text-ink underline underline-offset-4"
              >
                política de uso justo
              </TrackingLink>
              .
            </p>
          </section>

          <TrustPrinciples className="mt-10" />

          {/* 5. Preview da Jornada */}
          <div className="mt-16">
            <JourneyPreviewStatic />
          </div>

          {/* 7. Normal versus Aprofundar */}
          <div id="aprofundar" className="mt-16 scroll-mt-24">
            <DeepenComparisonStatic />
          </div>

          {/* 8. Comparação detalhada mobile-first */}
          <div id="comparar-uso" className="mt-16 scroll-mt-24">
            <PlanCompareStatic hasActiveSubscription={hasActiveSubscription} />
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
              {hasActiveSubscription ? (
                <Button
                  asChild
                  size="lg"
                  className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
                >
                  <TrackingLink href="/conta">
                    Gerenciar assinatura
                  </TrackingLink>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
                  >
                    <TrackingLink
                      href="/cadastro?plan=caminho"
                      conversionEvent="plan_selected"
                      conversionPlan="caminho"
                    >
                      Escolher o Caminho
                    </TrackingLink>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-h-11 w-full sm:w-auto"
                  >
                    <TrackingLink
                      href="/cadastro?plan=essencial"
                      conversionEvent="plan_selected"
                      conversionPlan="essencial"
                    >
                      Começar com o Essencial
                    </TrackingLink>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-h-11 w-full sm:w-auto"
                  >
                    <TrackingLink
                      href="/cadastro?plan=profundo"
                      conversionEvent="plan_selected"
                      conversionPlan="profundo"
                    >
                      Quero o Profundo
                    </TrackingLink>
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
