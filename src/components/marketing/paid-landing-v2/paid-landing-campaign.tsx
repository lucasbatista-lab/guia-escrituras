import { brand } from "@/config/brand";
import {
  getPaidLandingCampaignIds,
  type PaidLandingCampaignMode,
} from "@/components/marketing/paid-landing-v2/campaign-ids";
import { PaidLandingV2Clarity } from "@/components/marketing/paid-landing-v2/paid-landing-v2-clarity";
import { PaidLandingV2Close } from "@/components/marketing/paid-landing-v2/paid-landing-v2-close";
import { PaidLandingV2Continuity } from "@/components/marketing/paid-landing-v2/paid-landing-v2-continuity";
import { PaidLandingV2Media } from "@/components/marketing/paid-landing-v2/paid-landing-v2-media";
import { PaidLandingV2Offer } from "@/components/marketing/paid-landing-v2/paid-landing-v2-offer";
import { PaidLandingV2Recognition } from "@/components/marketing/paid-landing-v2/paid-landing-v2-recognition";
import { PaidLandingV2Sticky } from "@/components/marketing/paid-landing-v2/paid-landing-v2-sticky";
import { PaidLandingScrollCta } from "@/components/marketing/paid-landing/paid-landing-scroll-cta";
import { PaidLandingSectionView } from "@/components/marketing/paid-landing/paid-landing-section-view";
import { PublicConversionBeacon } from "@/components/marketing/public-conversion-beacon";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";

/**
 * Shared paid-campaign composition — direct_v1 path:
 * hero → demo → plans → video → institutional close.
 * - production (/comece): first-party measurement + Meta surfaces already gated
 * - preview (/comece-v2): visual parity without acquisition beacons
 */
export function PaidLandingCampaign({
  mode,
}: {
  mode: PaidLandingCampaignMode;
}) {
  const ids = getPaidLandingCampaignIds(mode);
  const isProduction = mode === "production";
  const plansHref = `#${ids.plans}` as const;
  const clarityHref = `#${ids.clarity}` as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-sand-50 pb-[calc(5rem+var(--safe-bottom))] md:pb-0">
      <noscript>
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
            Reflexões cristãs personalizadas
          </p>
          <p className="mt-2 font-display text-[1.65rem] leading-[1.05]">
            Conte o que você está vivendo. Receba uma reflexão cristã feita para
            o seu momento.
          </p>
          <p className="mt-2 text-ink-soft">
            Com referências bíblicas, respeito à tradição escolhida e um próximo
            passo prático.
          </p>
          <p className="mt-2 text-ink-soft">Assinaturas a partir de R$38/mês.</p>
          <p className="mt-4">
            <a className="underline" href={clarityHref}>
              Ver uma reflexão de exemplo
            </a>
            {" · "}
            <a className="underline" href={plansHref}>
              Conhecer os planos
            </a>
            {" · "}
            <a className="underline" href="/cadastro?plan=caminho">
              Criar conta no Caminho
            </a>
          </p>
        </div>
      </noscript>

      {isProduction ? (
        <>
          <PublicConversionBeacon event="paid_landing_viewed" />
          <PaidLandingSectionView
            event="paid_landing_demo_viewed"
            targetId={ids.clarity}
          />
          <PaidLandingSectionView
            event="paid_landing_plans_viewed"
            targetId={ids.plans}
          />
        </>
      ) : null}

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
        <section
          id={ids.hero}
          className="relative overflow-hidden"
          aria-labelledby={ids.heroHeading}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_88%_-10%,rgba(198,160,90,0.32),transparent_42%),radial-gradient(ellipse_at_-8%_70%,rgba(107,46,58,0.16),transparent_48%),linear-gradient(180deg,#F5EFE6_0%,#FBF8F3_55%,#FBF8F3_100%)]"
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-5 pt-1 sm:px-6 sm:pb-8 sm:pt-3 lg:pb-10 lg:pt-5">
            <div className="min-w-0 max-w-2xl animate-fade-up text-left">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
                Reflexões cristãs personalizadas
              </p>
              <h1
                id={ids.heroHeading}
                className="mt-1.5 font-display text-[clamp(1.85rem,7.2vw,2.55rem)] leading-[1.08] tracking-tight text-ink sm:mt-2 sm:text-[2.85rem] sm:leading-[1.08] lg:text-[3.15rem]"
              >
                Conte o que você está vivendo. Receba uma reflexão cristã feita
                para o seu momento.
              </h1>
              <p className="mt-2 max-w-xl text-[0.95rem] leading-snug text-ink-soft sm:mt-3 sm:text-[1.05rem] sm:leading-relaxed">
                Com referências bíblicas, respeito à tradição escolhida e um
                próximo passo prático.
              </p>
              <p className="mt-2 text-[0.9rem] font-medium leading-snug text-ink sm:text-base">
                Assinaturas a partir de R$38/mês.
              </p>

              <div className="mt-4 flex flex-col items-stretch gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
                <Button
                  asChild
                  size="lg"
                  className="min-h-11 w-full bg-wine px-5 text-[0.95rem] shadow-[0_16px_36px_-18px_rgba(107,46,58,0.8)] hover:bg-wine-soft sm:w-auto sm:min-h-12 sm:px-6 sm:text-base"
                >
                  {isProduction ? (
                    <PaidLandingScrollCta
                      href={clarityHref}
                      event="paid_landing_demo_clicked"
                    >
                      Ver uma reflexão de exemplo
                    </PaidLandingScrollCta>
                  ) : (
                    <a href={clarityHref}>Ver uma reflexão de exemplo</a>
                  )}
                </Button>
                {isProduction ? (
                  <PaidLandingScrollCta
                    href={plansHref}
                    event="paid_landing_primary_cta_clicked"
                    className="inline-flex min-h-11 items-center justify-center px-1 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline sm:justify-start"
                  >
                    Conhecer os planos
                  </PaidLandingScrollCta>
                ) : (
                  <a
                    href={plansHref}
                    className="inline-flex min-h-11 items-center justify-center px-1 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline sm:justify-start"
                  >
                    Conhecer os planos
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <PaidLandingV2Clarity
          sectionId={ids.clarity}
          plansHref={plansHref}
          trackPlanCta={isProduction}
        />
        <PaidLandingV2Offer plansId={ids.plans} />

        <section
          id={`${ids.hero}-video`}
          className="border-t border-border/40 bg-sand-100/40"
          aria-label="Vídeo de apresentação"
        >
          <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
              Apresentação
            </p>
            <h2 className="mt-1.5 max-w-xl font-sans text-[1.25rem] font-semibold leading-snug text-ink sm:text-[1.5rem]">
              Se preferir, veja o Amém Chat em vídeo.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
              Opcional — a demonstração acima já mostra o formato da reflexão.
            </p>
            <div className="relative mt-5 min-w-0 sm:mt-6">
              <PaidLandingV2Media
                className="mx-auto w-full max-w-[18rem] sm:max-w-[22rem] lg:max-w-[24rem]"
              />
            </div>
          </div>
        </section>

        <PaidLandingV2Recognition sectionId={ids.recognition} />
        <PaidLandingV2Continuity
          sectionId={ids.continuity}
          plansHref={plansHref}
          trackPrimaryCta={isProduction}
        />
        <PaidLandingV2Close
          faqId={ids.faq}
          brandId={ids.brand}
          finalCtaId={ids.finalCta}
          plansHref={plansHref}
          trackPrimaryCta={isProduction}
        />
      </main>

      <PaidLandingV2Sticky mode={mode} />
    </div>
  );
}
