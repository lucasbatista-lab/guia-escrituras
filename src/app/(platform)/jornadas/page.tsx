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
  const orderedItems = [...items].sort((a, b) => {
    const rank = (item: (typeof items)[number]) =>
      item.progress?.isStarted && !item.progress.isCompleted
        ? 0
        : item.progress?.isCompleted
          ? 2
          : 1;
    return rank(a) - rank(b);
  });
  const inProgressCount = items.filter(
    (item) => item.progress?.isStarted && !item.progress.isCompleted,
  ).length;
  const completedCount = items.filter(
    (item) => item.progress?.isCompleted,
  ).length;

  return (
    <div className="space-y-6">
      <JourneyCatalogBeacon />
      <PlatformPageHeader
        title="Jornadas de leitura"
        description="Trilhas editoriais sobre temas reais da vida — sete etapas por jornada, no seu ritmo. Não substituem terapia, aconselhamento profissional ou emergência."
      />

      {entitled && !journeysDisabled ? (
        <dl className="grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card/60 py-3 text-center">
          <div className="px-2">
            <dt className="text-xs text-ink-soft">Em andamento</dt>
            <dd className="mt-1 font-display text-xl text-ink">{inProgressCount}</dd>
          </div>
          <div className="px-2">
            <dt className="text-xs text-ink-soft">Concluídas</dt>
            <dd className="mt-1 font-display text-xl text-ink">{completedCount}</dd>
          </div>
          <div className="px-2">
            <dt className="text-xs text-ink-soft">Disponíveis</dt>
            <dd className="mt-1 font-display text-xl text-ink">{items.length}</dd>
          </div>
        </dl>
      ) : null}

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
        {orderedItems.map(({ journey: j, progress, estimatedMinutes }) => {
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
                "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card/70 p-5 shadow-[0_14px_40px_-34px_rgba(44,36,28,0.7)]",
                visual.borderClass,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 top-0 h-1",
                  progress?.isStarted && !progress.isCompleted
                    ? "bg-wine"
                    : progress?.isCompleted
                      ? "bg-gold"
                      : "bg-sand-200",
                )}
              />
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
                  <Button
                    asChild
                    className={cn(
                      "min-h-11 w-full",
                      progress?.isStarted &&
                        !progress.isCompleted &&
                        "bg-wine hover:bg-wine-soft",
                    )}
                  >
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
