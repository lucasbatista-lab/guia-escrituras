import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Como funciona",
};

const steps = [
  {
    title: "Escolha seu plano",
    body: "Essencial, Caminho ou Profundo — com benefícios claros do que já está disponível.",
  },
  {
    title: "Crie a conta e confirme o e-mail",
    body: "Você só segue para o pagamento depois da confirmação.",
  },
  {
    title: "Pague com segurança e personalize",
    body: "Checkout pela Stripe. Depois escolha tradição, estilo e profundidade.",
  },
  {
    title: "Traga sua situação",
    body: "Receba orientação com referências bíblicas, interpretação e um próximo passo possível.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl text-ink">Como funciona</h1>
        <p className="mt-4 text-ink-soft leading-relaxed">
          {brand.name} — {brand.description} A pergunta central — “
          {brand.tagline}” — é respondida como interpretação ancorada nos
          Evangelhos, nunca como pretensa voz divina.
        </p>
        <ol className="mt-12 space-y-8">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sm font-medium text-ink">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-xl text-ink">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Button asChild className="mt-12 min-h-11 bg-ink hover:bg-ink/90">
          <TrackingLink href="/planos">Escolher meu plano</TrackingLink>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
