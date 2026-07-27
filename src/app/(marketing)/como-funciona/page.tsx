import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Como funciona",
  description:
    "Entenda como o Amém Chat funciona: escolha o plano, confirme o e-mail, pague com segurança e personalize a experiência.",
  path: "/como-funciona",
});

const steps = [
  {
    title: "Escolha seu plano",
    body: "Essencial, Caminho ou Profundo — com o que já está disponível hoje.",
  },
  {
    title: "Crie sua conta e confirme o e-mail",
    body: "Você só segue para o pagamento depois da confirmação.",
  },
  {
    title: "Conclua o pagamento com segurança",
    body: "Checkout pela Stripe. Renovação mensal, cancelável na sua conta.",
  },
  {
    title: "Personalize a experiência e traga sua situação",
    body: "Escolha tradição e profundidade. Depois receba orientação com referências bíblicas, interpretação e um próximo passo possível.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-12 outline-none sm:px-6"
      >
        <h1 className="font-display text-4xl text-ink">Como funciona</h1>
        <p className="mt-4 text-ink-soft leading-relaxed">
          {brand.name} — {brand.description} Não se apresenta como voz divina:
          é inteligência artificial baseada nas Escrituras, com limites
          honestos.
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
          <TrackingLink href="/planos">Ver planos</TrackingLink>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
