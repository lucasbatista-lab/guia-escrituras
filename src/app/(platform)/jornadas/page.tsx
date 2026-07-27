import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneyCatalogBeacon } from "@/components/journeys/journey-catalog-beacon";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
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
import { InlineNotice } from "@/components/platform/inline-notice";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JornadasPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/jornadas");
  }

  const journey = await resolveUserJourneyState();
  if (!journeyHasEffectiveAccess(journey.state)) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  const journeysDisabled = isFeatureDisabled("journeys");
  const entitled = canUseReadingJourneys(auth.planKey);
  const progressMap =
    entitled && !journeysDisabled
      ? await loadJourneyProgressMap(auth.userId)
      : new Map();
  const items = buildCatalogItems(progressMap);

  return (
    <div className="space-y-8">
      <JourneyCatalogBeacon />
      <PlatformPageHeader
        title="Jornadas de leitura"
        description="Trilhas editoriais sobre temas reais da vida — sete etapas por jornada, no seu ritmo. Não substituem terapia, aconselhamento profissional ou emergência."
      />

      {journeysDisabled ? (
        <InlineNotice tone="info">
          As Jornadas estão temporariamente indisponíveis por manutenção
          operacional. Seu progresso salvo permanece — tente novamente em breve.
        </InlineNotice>
      ) : null}

      {!entitled && !journeysDisabled ? (
        <div className="rounded-xl border border-border/70 bg-sand-50/80 p-4 text-sm text-ink-soft">
          <p>
            Jornadas de leitura guiadas estão incluídas nos planos Caminho,
            Profundo e Particular. O Essencial continua com o chat completo — a
            diferença está nas trilhas editoriais e na flexibilidade de uso.
          </p>
          <p className="mt-3">
            <Link
              href="/planos#comparar-uso"
              className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4"
            >
              Comparar planos
            </Link>
          </p>
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ journey: j, progress, estimatedMinutes }) => {
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
                "flex min-w-0 flex-col rounded-2xl border bg-card/60 p-5",
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
                <div className="min-w-0">
                  <h2 className="break-words font-display text-xl text-ink">
                    {j.title}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-ink-soft">
                    {status}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                {j.objective}
              </p>
              <p className="mt-3 text-xs text-ink-soft">{duration}</p>
              {entitled && !journeysDisabled && progress ? (
                <div className="mt-4">
                  <JourneyProgressBar
                    progress={progress}
                    totalSteps={j.steps.length}
                    journeySlug={j.slug}
                    labelId={`progress-${j.slug}`}
                  />
                </div>
              ) : null}
              {journeysDisabled ? (
                <p className="mt-5 text-xs text-ink-soft">
                  Temporariamente indisponível — progresso preservado.
                </p>
              ) : entitled ? (
                <div className="mt-5">
                  <Button asChild className="min-h-11 w-full">
                    <Link href={continueHref}>{cta}</Link>
                  </Button>
                </div>
              ) : (
                <p className="mt-5 text-xs text-ink-soft">
                  Disponível no Caminho e planos superiores.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
