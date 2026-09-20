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
    "Crie uma conta grátis para Hoje com Deus. Para conversar: escolha o plano, pague com segurança, confirme o e-mail e personalize a experiência.",
  path: "/como-funciona",
});

const steps = [
  {
    title: "Crie uma conta grátis",
    body: "Sem cartão. Confirme o e-mail e use Hoje com Deus, orações, salvos e diário.",
  },
  {
    title: "Converse quando quiser ir além",
    body: "Os planos pagos abrem o chat com memória, Jornadas (Caminho+) e Aprofundar (Profundo).",
  },
  {
    title: "Pagamento só no plano",
    body: "Checkout pela Stripe. Renovação mensal, cancelável na sua conta. Não é teste grátis: a conta gratuita já é o produto diário.",
  },
  {
    title: "Personalize se assinar",
    body: "Tradição e profundidade moldam o chat. O espaço gratuito continua disponível na mesma conta.",
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
              Da conta grátis à conversa
            </p>
            <h1 className="mt-2 font-display text-4xl text-ink">Como funciona</h1>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
              {brand.name} — {brand.description} Inteligência artificial
              baseada nas Escrituras, com limites honestos.
            </p>
            <Button asChild className="mt-5 min-h-11 bg-ink hover:bg-ink/90">
              <TrackingLink href="/cadastro">Criar conta grátis</TrackingLink>
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
          A confirmação do e-mail libera o acesso; no fluxo com plano, o
          pagamento não fica bloqueado por ela. Depois da assinatura, a
          personalização leva poucos instantes e pode ser revista na conta.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
