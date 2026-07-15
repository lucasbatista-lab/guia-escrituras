import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { PlanCards } from "@/components/marketing/plan-cards";
import { TrackingLink } from "@/components/marketing/tracking-link";

export const metadata: Metadata = {
  title: "Planos",
};

export default function PlanosPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl text-ink">Planos</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Assinatura mensal com renovação automática. Cada plano libera
          benefícios utilizáveis agora; a diferença principal está na frequência
          de uso e na profundidade das conversas.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Essencial é o ponto de entrada. Caminho é a recomendação principal
          para uso regular. Profundo amplia contexto e margem nas reflexões já
          disponíveis hoje.
        </p>

        <ul className="mt-6 max-w-2xl space-y-2 text-sm text-ink-soft">
          <li>· Checkout seguro processado pela Stripe</li>
          <li>· Uso flexível dentro do orçamento do plano (sem cota rígida de mensagens)</li>
          <li>
            · Cancelamento da renovação pela sua conta no Amém Chat, com acesso
            até o fim do período já pago
          </li>
        </ul>

        <div className="mt-10">
          <PlanCards />
        </div>

        <p className="mt-10 max-w-2xl text-sm text-ink-soft">
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
