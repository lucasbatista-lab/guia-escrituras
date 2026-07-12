import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { PlanCards } from "@/components/marketing/plan-cards";

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
          Cada plano libera um conjunto de entitlements. Não destacamos
          números de mensagens — o uso é flexível ao longo do mês, com
          proteção de orçamento e limite diário de segurança.
        </p>
        <div className="mt-10">
          <PlanCards />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
