import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { PaidLandingV2Clarity } from "@/components/marketing/paid-landing-v2/paid-landing-v2-clarity";
import { PaidLandingV2Close } from "@/components/marketing/paid-landing-v2/paid-landing-v2-close";
import { PaidLandingV2Continuity } from "@/components/marketing/paid-landing-v2/paid-landing-v2-continuity";
import { PaidLandingV2Media } from "@/components/marketing/paid-landing-v2/paid-landing-v2-media";
import { PaidLandingV2Offer } from "@/components/marketing/paid-landing-v2/paid-landing-v2-offer";
import { PaidLandingV2Recognition } from "@/components/marketing/paid-landing-v2/paid-landing-v2-recognition";
import { PaidLandingV2Sticky } from "@/components/marketing/paid-landing-v2/paid-landing-v2-sticky";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import {
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";

const PAGE_TITLE = "Organize o que está pesando";
const PAGE_DESCRIPTION =
  "Conte sua situação. Receba perguntas e referências bíblicas que ajudam a separar o que está em jogo — com responsabilidade.";

/**
 * Experimental paid landing V2 — campaign composition preview.
 * Public by direct URL; noindex/nofollow; not in sitemap/nav/footer.
 * Does not replace /comece. Avoids first-party paid_landing_* beacons
 * so preview traffic does not contaminate the production baseline.
 */
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/comece-v2" },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    url: `${brand.canonicalUrl}/comece-v2`,
    siteName: brand.name,
    locale: "pt_BR",
    type: "website",
    images: socialOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    images: socialTwitterImages(),
  },
};

export default function ComecePaidLandingV2Page() {
  return (
    <div className="min-h-screen bg-sand-50 pb-[calc(4.5rem+var(--safe-bottom))] md:pb-0">
      <noscript>
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
            Reflexões cristãs para situações reais
          </p>
          <p className="mt-2 font-display text-[1.65rem] leading-[1.05]">
            Organize o que está pesando. Enxergue um próximo passo.
          </p>
          <p className="mt-2 text-ink-soft">
            Conte sua situação. Receba perguntas e referências bíblicas que
            ajudam a separar o que está em jogo — com responsabilidade.
          </p>
          <p className="mt-2 text-ink-soft">
            A partir de R$38/mês · cancele a renovação pela Conta
          </p>
          <p className="mt-4">
            <a className="underline" href="#planos-v2">
              Escolher meu plano
            </a>
            {" · "}
            <a className="underline" href="#clareza-v2">
              Ver um exemplo
            </a>
            {" · "}
            <a className="underline" href="/cadastro?plan=caminho">
              Criar conta no Caminho
            </a>
          </p>
        </div>
      </noscript>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-0 pt-safe sm:px-6">
        <TrackingLink href="/" className="min-h-11 py-1">
          <span className="font-display text-xl tracking-tight text-ink sm:text-2xl">
            {brand.name}
          </span>
        </TrackingLink>
        <TrackingLink
          href="/entrar"
          className="inline-flex min-h-11 items-center text-sm text-ink-soft transition hover:text-ink"
        >
          Já sou assinante
        </TrackingLink>
      </header>

      <main id="conteudo-principal" tabIndex={-1} className="outline-none">
        {/* ── Hero: campaign composition ── */}
        <section
          id="comece-v2-hero"
          className="relative overflow-hidden"
          aria-labelledby="comece-v2-hero-heading"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_88%_-10%,rgba(198,160,90,0.32),transparent_42%),radial-gradient(ellipse_at_-8%_70%,rgba(107,46,58,0.16),transparent_48%),linear-gradient(180deg,#F5EFE6_0%,#FBF8F3_55%,#FBF8F3_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 top-24 hidden h-[28rem] w-[28rem] rounded-full bg-ink/[0.04] blur-3xl lg:block"
          />

          <div className="relative mx-auto grid max-w-6xl gap-3 px-4 pb-4 pt-0.5 sm:gap-6 sm:px-6 sm:pb-10 sm:pt-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-center lg:gap-8 lg:pb-14 lg:pt-5">
            <div className="min-w-0 max-w-xl animate-fade-up text-left lg:max-w-[34rem]">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
                Reflexões cristãs para situações reais
              </p>
              <h1
                id="comece-v2-hero-heading"
                className="mt-1.5 font-display text-[clamp(2.05rem,8.4vw,2.65rem)] leading-[1.04] tracking-tight text-ink sm:mt-2 sm:text-[3.15rem] sm:leading-[1.05] lg:text-[3.45rem] lg:leading-[1.05] xl:text-[3.75rem]"
              >
                <span className="block">Organize o que está pesando.</span>
                <span className="block">Enxergue um próximo passo.</span>
              </h1>
              <p className="mt-2 max-w-md text-[0.95rem] leading-snug text-ink-soft sm:mt-3 sm:max-w-lg sm:text-[1.05rem] sm:leading-relaxed">
                Conte sua situação. Receba perguntas e referências bíblicas que
                ajudam a separar o que está em jogo — com responsabilidade.
              </p>

              <div className="mt-3 sm:mt-5">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1.5">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-11 w-full bg-wine px-5 text-[0.95rem] shadow-[0_16px_36px_-18px_rgba(107,46,58,0.8)] hover:bg-wine-soft sm:w-auto sm:min-h-12 sm:px-6 sm:text-base"
                  >
                    <a href="#planos-v2">Escolher meu plano</a>
                  </Button>
                  <a
                    href="#clareza-v2"
                    className="inline-flex min-h-10 items-center px-1 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline sm:min-h-11"
                  >
                    Ver um exemplo
                  </a>
                </div>
                <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-soft sm:mt-2 sm:text-sm">
                  A partir de R$38/mês · cancele a renovação pela Conta
                </p>
              </div>
            </div>

            <div className="relative min-w-0 animate-fade-up-delayed">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-3 -inset-y-4 rounded-[2.5rem] bg-ink/[0.07] sm:-inset-x-8 sm:-inset-y-10 lg:-right-16 lg:left-4"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-3 -right-2 h-24 w-24 rounded-full bg-gold/25 blur-2xl sm:h-32 sm:w-32"
              />
              <div className="relative max-h-[min(54vh,24rem)] overflow-hidden sm:max-h-none lg:translate-x-2 lg:scale-[1.04]">
                <PaidLandingV2Media
                  priority
                  className="mx-auto w-full max-w-[20rem] sm:max-w-[26rem] lg:max-w-none"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-sand-50 to-transparent sm:hidden"
                />
              </div>
            </div>
          </div>
        </section>

        <PaidLandingV2Recognition />
        <PaidLandingV2Clarity />
        <PaidLandingV2Continuity />
        <PaidLandingV2Offer />
        <PaidLandingV2Close />
      </main>

      <PaidLandingV2Sticky />
    </div>
  );
}
