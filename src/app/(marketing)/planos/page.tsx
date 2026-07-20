import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { PlanCards } from "@/components/marketing/plan-cards";
import { PlanComparisonViewBeacon } from "@/components/marketing/plan-comparison-view-beacon";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { getAuthUserContext } from "@/lib/auth/session";
import { isActiveSubscription } from "@/lib/billing";
import {
  DEEPEN_FEATURE_DISCLAIMERS,
  DEEPEN_FEATURE_SUMMARY,
  PLAN_ROADMAP_ITEMS,
  PLAN_USAGE_PROFILES,
  SHARED_PLAN_INCLUDES,
} from "@/lib/marketing/plan-public-copy";
import { PLAN_COMMERCIAL_FAQ } from "@/lib/marketing/plan-faq";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Planos",
  description:
    "Compare os planos do Amém Chat: Essencial para começar, Caminho para uso frequente e Profundo com Aprofundar sob demanda.",
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
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-12 outline-none sm:px-6"
      >
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl text-ink">Planos</h1>
          <p className="mt-3 text-ink-soft">
            Assinatura mensal com renovação automática. Todos os planos incluem
            o chat completo — a diferença está no ritmo de uso e, no Profundo,
            no recurso Aprofundar.
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
            . A troca automática entre planos ainda não está disponível — use
            esta página para comparar e avisaremos na conta quando estiver
            pronta.
          </p>
        ) : null}

        <section
          id="comparar-uso"
          className="mt-10 scroll-mt-24"
          aria-labelledby="comparar-uso-heading"
        >
          <h2
            id="comparar-uso-heading"
            className="font-display text-2xl text-ink"
          >
            Qual ritmo combina com você?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Escolha pelo perfil de utilização — sem cotas rígidas de mensagens,
            dentro da{" "}
            <TrackingLink
              href="/uso-justo"
              className="text-ink underline underline-offset-4"
            >
              política de uso justo
            </TrackingLink>
            .
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {(["essencial", "caminho", "profundo"] as const).map((key) => {
              const profile = PLAN_USAGE_PROFILES[key];
              const title =
                key === "essencial"
                  ? "Essencial"
                  : key === "caminho"
                    ? "Caminho"
                    : "Profundo";
              return (
                <li
                  key={key}
                  className="rounded-2xl border border-border/70 bg-card/60 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                    {profile.headline}
                  </p>
                  <p className="mt-1 font-display text-lg text-ink">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {profile.example}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-12">
          <PlanCards
            currentPlanKey={hasActiveSubscription ? auth?.planKey ?? null : null}
            hasActiveSubscription={hasActiveSubscription}
          />
        </div>

        <section
          id="aprofundar"
          className="mt-14 scroll-mt-24 max-w-2xl"
          aria-labelledby="aprofundar-heading"
        >
          <h2 id="aprofundar-heading" className="font-display text-2xl text-ink">
            O que é Aprofundar?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {DEEPEN_FEATURE_SUMMARY}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            {DEEPEN_FEATURE_DISCLAIMERS.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-14 max-w-2xl"
          aria-labelledby="todos-planos-heading"
        >
          <h2 id="todos-planos-heading" className="font-display text-2xl text-ink">
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

        <section
          className="mt-14 max-w-2xl"
          aria-labelledby="roadmap-heading"
        >
          <h2 id="roadmap-heading" className="font-display text-2xl text-ink">
            Em desenvolvimento
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Recursos abaixo não fazem parte da promessa ativa nem justificam o
            preço de hoje.
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

        <section
          className="mt-14 max-w-2xl"
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

        <ul className="mt-10 max-w-2xl space-y-2 text-sm text-ink-soft">
          <li>· Checkout seguro processado pela Stripe</li>
          <li>
            · Cancelamento da renovação pela sua conta, com acesso até o fim do
            período pago
          </li>
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
