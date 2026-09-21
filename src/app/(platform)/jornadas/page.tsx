import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneyCatalogBeacon } from "@/components/journeys/journey-catalog-beacon";
import { JourneyCatalogCard } from "@/components/journeys/journey-catalog-card";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { JourneyCoverArt } from "@/components/journeys/covers/journey-cover-art";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/platform/inline-notice";
import { IconChevron } from "@/components/brand/icons/archive-icons";
import { getAuthUserContext } from "@/lib/auth";
import {
  getSoftPaywallCopy,
  journeyShowsSoftPaywall,
} from "@/lib/commerce/soft-paywall";
import {
  journeyCtaLabel,
  journeyCurrentStepNumber,
  journeyShortPromise,
} from "@/lib/journeys/display";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";
import { buildCatalogItems, loadJourneyProgressMap } from "@/lib/journeys/server";
import { isFeatureDisabled } from "@/config/feature-kill-switches";
import { journeyResumeHint } from "@/lib/journeys/presentation";

export const dynamic = "force-dynamic";

export default async function JornadasPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/jornadas");
  }

  const journey = await resolveUserJourneyState();
  const softFree = journeyShowsSoftPaywall(journey.state);
  if (!journeyHasEffectiveAccess(journey.state) && !softFree) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  const journeysDisabled = isFeatureDisabled("journeys");
  const entitled = canUseReadingJourneys(auth.planKey);
  const progressMap =
    !journeysDisabled
      ? await loadJourneyProgressMap(auth.userId)
      : new Map();
  const items = buildCatalogItems(progressMap);
  const orderedItems = [...items].sort((a, b) => {
    const rank = (item: (typeof items)[number]) =>
      item.progress?.isStarted && !item.progress.isCompleted
        ? 0
        : item.progress?.isCompleted
          ? 2
          : 1;
    return rank(a) - rank(b);
  });
  const activeItem = orderedItems.find(
    (item) => item.progress?.isStarted && !item.progress.isCompleted,
  );
  const restItems = orderedItems.filter((item) => item !== activeItem);
  const paywallCopy = getSoftPaywallCopy("jornadas");

  return (
    <div className="space-y-7">
      <JourneyCatalogBeacon />
      <header className="space-y-2">
        <p className="amem-type-context text-wine">Caminhos</p>
        <h1 className="amem-type-screen text-[28px] text-ink">
          Sete dias com um tema
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Trilhas editoriais sobre a vida real — no seu ritmo. Não substituem
          terapia, aconselhamento profissional ou emergência.
        </p>
      </header>

      {journeysDisabled ? (
        <InlineNotice tone="info">
          Os Caminhos estão temporariamente indisponíveis por manutenção
          operacional. Seu progresso salvo permanece — tente novamente em breve.
        </InlineNotice>
      ) : null}

      {!entitled && !journeysDisabled ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Prévia aberta: viva o Dia 1 completo. Os dias seguintes — com
            progresso salvo no caminho inteiro — pedem o plano Caminho. Essencial
            continua com Conversar; a conta grátis mantém Hoje e Espaço.
          </p>
          <SoftPaywallSheet copy={paywallCopy} defaultOpen={false} />
          <ul className="space-y-4">
            {items.map(({ journey: j, progress }) => {
              const firstStep = j.steps[0];
              const dayOneDone = Boolean(
                firstStep && progress?.completedStepIds.includes(firstStep.id),
              );
              const previewHref = firstStep
                ? `/jornadas/${j.slug}/${firstStep.slug}`
                : `/jornadas/${j.slug}`;
              return (
                <JourneyCatalogCard
                  key={j.slug}
                  journey={j}
                  progress={progress}
                  preview
                  dayOneDone={dayOneDone}
                  previewHref={previewHref}
                />
              );
            })}
          </ul>
        </div>
      ) : null}

      {entitled && !journeysDisabled && activeItem ? (
        <section
          aria-labelledby="caminho-ativo-heading"
          className="relative overflow-hidden rounded-[26px] shadow-[0_20px_48px_-28px_rgba(44,36,28,0.55)]"
        >
          <div className="relative">
            <JourneyCoverArt slug={activeItem.journey.slug} size="hero" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16">
              <p
                id="caminho-ativo-heading"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F0E6D0]/90"
              >
                Em andamento
              </p>
              <h2 className="mt-1.5 font-display text-[26px] leading-tight text-[#FFF9F0]">
                {activeItem.journey.title}
              </h2>
              <p className="mt-1.5 text-sm text-[#FFF9F0]/75">
                {journeyShortPromise(activeItem.journey.slug)}
              </p>
            </div>
          </div>
          <div className="space-y-4 border border-t-0 border-border/50 bg-[color:var(--amem-surface)] px-5 py-5">
            <p className="text-sm leading-relaxed text-ink-soft">
              {journeyResumeHint(activeItem.progress, activeItem.journey.steps)}
            </p>
            <JourneyProgressBar
              progress={activeItem.progress}
              totalSteps={activeItem.journey.steps.length}
              journeySlug={activeItem.journey.slug}
              labelId={`progress-active-${activeItem.journey.slug}`}
            />
            {(() => {
              const j = activeItem.journey;
              const progress = activeItem.progress;
              const stepNumber = journeyCurrentStepNumber(progress, j.steps);
              const cta = journeyCtaLabel(progress, {
                currentStepNumber: stepNumber,
              });
              const firstStep = j.steps[0];
              const continueHref =
                progress?.currentStepId && !progress.isCompleted
                  ? `/jornadas/${j.slug}/${j.steps.find((s) => s.id === progress.currentStepId)?.slug ?? firstStep?.slug}`
                  : `/jornadas/${j.slug}`;
              return (
                <Button asChild variant="ritual" className="min-h-12 w-full text-base">
                  <Link href={continueHref} className="inline-flex items-center justify-center gap-2">
                    {cta}
                    <IconChevron className="size-4 opacity-90" />
                  </Link>
                </Button>
              );
            })()}
          </div>
        </section>
      ) : null}

      {entitled && !journeysDisabled ? (
        <ul className="space-y-4">
          {(activeItem ? restItems : orderedItems).map(
            ({ journey: j, progress, estimatedMinutes }) => (
              <JourneyCatalogCard
                key={j.slug}
                journey={j}
                progress={progress}
                estimatedMinutes={estimatedMinutes}
              />
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}
