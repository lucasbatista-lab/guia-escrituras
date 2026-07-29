import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { ProductHeroPreview } from "@/components/marketing/product-hero-preview";
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
        className="mx-auto max-w-5xl px-4 py-8 outline-none sm:px-6 sm:py-12"
      >
        <div className="grid items-center gap-7 lg:grid-cols-[1fr_0.85fr] lg:gap-12">
          <header>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
              Da escolha à primeira reflexão
            </p>
            <h1 className="mt-2 font-display text-4xl text-ink">Como funciona</h1>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
              {brand.name} — {brand.description} Inteligência artificial
              baseada nas Escrituras, com limites honestos.
            </p>
            <Button asChild className="mt-5 min-h-11 bg-ink hover:bg-ink/90">
              <TrackingLink href="/planos">Escolher meu plano</TrackingLink>
            </Button>
          </header>
          <ProductHeroPreview />
        </div>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card/60 p-4"
            >
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
        <p className="mt-8 text-sm text-ink-soft">
          Você confirma o e-mail antes do pagamento. Depois da assinatura, a
          personalização leva poucos instantes e pode ser revista na conta.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
