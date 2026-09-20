import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneyCatalogBeacon } from "@/components/journeys/journey-catalog-beacon";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { LockPill } from "@/components/commerce/lock-pill";
import { SoftPaywallGate } from "@/components/commerce/soft-paywall-gate";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/platform/inline-notice";
import { getAuthUserContext } from "@/lib/auth";
import {
  getSoftPaywallCopy,
  journeyShowsSoftPaywall,
} from "@/lib/commerce/soft-paywall";
import {
  getJourneyVisual,
  journeyCtaLabel,
  journeyCurrentStepNumber,
  journeyDurationLabel,
  journeyStatusLabel,
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
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JornadasPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/jornadas");
  }

  const journey = await resolveUserJourneyState();
  if (!journeyHasEffectiveAccess(journey.state)) {
    if (journeyShowsSoftPaywall(journey.state)) {
      return <SoftPaywallGate resource="jornadas" />;
    }
    redirect(getRequiredDestinationForState(journey.state));
  }

  const journeysDisabled = isFeatureDisabled("journeys");
  const entitled = canUseReadingJourneys(auth.planKey);
  const progressMap =
    entitled && !journeysDisabled
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
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
          Caminhos
        </p>
        <h1 className="font-display text-[28px] leading-tight text-ink">
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
            Prévia aberta: veja o tema. O caminho completo — sete dias com
            progresso salvo — pede o plano Caminho. Essencial continua com
            Conversar; a conta grátis mantém Hoje e Espaço.
          </p>
          <SoftPaywallSheet copy={paywallCopy} defaultOpen={false} />
          <ul className="space-y-2">
            {items.map(({ journey: j }) => (
              <li
                key={j.slug}
                className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{j.title}</p>
                  <p className="text-xs text-ink-soft">7 dias · bloqueado</p>
                </div>
                <LockPill label="Caminho" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {entitled && !journeysDisabled && activeItem ? (
        <section
          aria-labelledby="caminho-ativo-heading"
          className="amem-surface-poco relative overflow-hidden p-5"
        >
          <p
            id="caminho-ativo-heading"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
          >
            Em andamento
          </p>
          <h2 className="mt-2 font-display text-2xl text-ink">
            {activeItem.journey.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {journeyResumeHint(activeItem.progress, activeItem.journey.steps)}
          </p>
          <div className="mt-4">
            <JourneyProgressBar
              progress={activeItem.progress}
              totalSteps={activeItem.journey.steps.length}
              journeySlug={activeItem.journey.slug}
              labelId={`progress-active-${activeItem.journey.slug}`}
            />
          </div>
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
              <div className="mt-5">
                <Button asChild variant="ritual" className="min-h-11 w-full sm:w-auto">
                  <Link href={continueHref}>{cta}</Link>
                </Button>
              </div>
            );
          })()}
        </section>
      ) : null}

      {entitled && !journeysDisabled ? (
        <ul className="space-y-3">
          {(activeItem ? restItems : orderedItems).map(
            ({ journey: j, progress, estimatedMinutes }) => {
              const visual = getJourneyVisual(j.slug);
              const status = journeyStatusLabel(progress);
              const stepNumber = journeyCurrentStepNumber(progress, j.steps);
              const cta = journeyCtaLabel(progress, {
                currentStepNumber: stepNumber,
              });
              const minutesPerStep =
                j.steps.length > 0
                  ? Math.round(estimatedMinutes / j.steps.length)
                  : null;
              const duration = journeyDurationLabel({
                stepCount: j.steps.length,
                minutesPerStep,
              });
              const firstStep = j.steps[0];
              const continueHref =
                progress?.currentStepId && !progress.isCompleted
                  ? `/jornadas/${j.slug}/${j.steps.find((s) => s.id === progress.currentStepId)?.slug ?? firstStep?.slug}`
                  : progress?.isCompleted
                    ? `/jornadas/${j.slug}/${firstStep?.slug}`
                    : `/jornadas/${j.slug}`;

              return (
                <li
                  key={j.slug}
                  className={cn(
                    "relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border bg-[color:var(--amem-surface)]/90 p-5",
                    visual.borderClass,
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg",
                        visual.markBgClass,
                        visual.markTextClass,
                      )}
                      aria-hidden
                    >
                      {visual.mark}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words font-display text-xl text-ink">
                        {j.title}
                      </h2>
                      <p className="mt-1 text-xs font-medium text-ink-soft">
                        {status}
                        {" · "}
                        {duration}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                        {j.objective}
                      </p>
                    </div>
                  </div>
                  {progress ? (
                    <div className="mt-4">
                      <JourneyProgressBar
                        progress={progress}
                        totalSteps={j.steps.length}
                        journeySlug={j.slug}
                        labelId={`progress-${j.slug}`}
                      />
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <Button
                      asChild
                      variant={
                        progress?.isStarted && !progress.isCompleted
                          ? "ritual"
                          : "outline"
                      }
                      className="min-h-11"
                    >
                      <Link href={continueHref}>{cta}</Link>
                    </Button>
                  </div>
                </li>
              );
            },
          )}
        </ul>
      ) : null}
    </div>
  );
}
