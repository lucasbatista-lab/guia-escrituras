import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { PlanCards } from "@/components/marketing/plan-cards";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { getAuthUserContext } from "@/lib/auth/session";
import { isActiveSubscription } from "@/lib/billing";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Planos",
  description:
    "Conheça os planos do Amém Chat: reflexão cristã com IA baseada nas Escrituras, com margens de uso claras e renovação mensal.",
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
      <SiteHeader />
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-12 outline-none sm:px-6"
      >
        <h1 className="font-display text-4xl text-ink">Planos</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Assinatura mensal com renovação automática. Cada plano oferece o mesmo
          núcleo de reflexão; a diferença principal está na frequência de uso e
          na margem mensal disponível.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Essencial é para uso moderado. Caminho é a recomendação principal para
          quem volta várias vezes por semana. Profundo amplia a margem para uso
          intensivo ao longo do mês.
        </p>

        <ul className="mt-6 max-w-2xl space-y-2 text-sm text-ink-soft">
          <li>· Checkout seguro processado pela Stripe</li>
          <li>
            · Uso flexível dentro da política de uso justo (sem cota rígida de
            mensagens)
          </li>
          <li>
            · Cancelamento da renovação pela sua conta no Amém Chat, com acesso
            até o fim do período já pago
          </li>
        </ul>

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
            . A troca entre planos estará disponível em breve.
          </p>
        ) : null}

        <div className="mt-10">
          <PlanCards
            currentPlanKey={hasActiveSubscription ? auth?.planKey ?? null : null}
            hasActiveSubscription={hasActiveSubscription}
          />
        </div>

        <p className="mt-10 max-w-2xl text-sm text-ink-soft">
          A profundidade do perfil define o estilo das respostas comuns. A
          resposta aprofundada sob demanda é um modo especial por mensagem,
          disponível no Profundo (e no Particular quando provisionado).{" "}
          Recursos ainda em construção aparecem em cada cartão como “Em
          desenvolvimento” e não fazem parte da promessa ativa.{" "}
          <TrackingLink
            href="/uso-justo"
            className="text-ink underline underline-offset-4"
          >
            Saiba mais sobre uso justo
          </TrackingLink>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
