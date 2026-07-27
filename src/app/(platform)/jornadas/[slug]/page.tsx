import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { JourneyResetButton } from "@/components/journeys/journey-reset-button";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { isFeatureDisabled } from "@/config/feature-kill-switches";
import { getAuthUserContext } from "@/lib/auth";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";
import {
  getJourneyVisual,
  journeyCtaLabel,
  journeyCurrentStepNumber,
  journeyDurationLabel,
} from "@/lib/journeys/display";
import {
  ensureJourneyStarted,
} from "@/lib/journeys/server";
import {
  getJourneyBySlug,
  getJourneyEstimatedMinutes,
} from "@/lib/journeys/registry";
import {
  buildJourneyResumePath,
  buildLoginHref,
} from "@/lib/navigation/safe-next-path";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JornadaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect(buildLoginHref(buildJourneyResumePath(slug), "/jornadas"));
  }

  if (isFeatureDisabled("journeys")) {
    redirect("/jornadas");
  }

  const journeyState = await resolveUserJourneyState();
  if (!journeyHasEffectiveAccess(journeyState.state)) {
    redirect(getRequiredDestinationForState(journeyState.state));
  }

  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();

  if (!canUseReadingJourneys(auth.planKey)) {
    redirect("/jornadas");
  }

  const progress = await ensureJourneyStarted(auth.userId, journey.slug);
  const estimatedMinutes = getJourneyEstimatedMinutes(journey);
  const minutesPerStep =
    journey.steps.length > 0
      ? Math.round(estimatedMinutes / journey.steps.length)
      : null;
  const visual = getJourneyVisual(journey.slug);
  const stepNumber = journeyCurrentStepNumber(progress, journey.steps);
  const currentStep = journey.steps.find((s) => s.id === progress.currentStepId);
  const nextHref = currentStep
    ? `/jornadas/${journey.slug}/${currentStep.slug}`
    : `/jornadas/${journey.slug}/${journey.steps[0]!.slug}`;
  const cta = journeyCtaLabel(progress, { currentStepNumber: stepNumber });
  const doneCount = progress.completedStepIds.length;
  const reallyCompleted = Boolean(progress.completedAt && progress.isCompleted);

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-xl",
            visual.markBgClass,
            visual.markTextClass,
          )}
          aria-hidden
        >
          {visual.mark}
        </span>
        <PlatformPageHeader
          className="min-w-0 flex-1"
          title={journey.title}
          description={journey.description}
        />
      </div>

      <p className="text-sm text-ink-soft">
        <span className="font-medium text-ink">Objetivo:</span>{" "}
        {journey.objective}
      </p>

      <p className="text-sm text-ink-soft">
        {journeyDurationLabel({
          stepCount: journey.steps.length,
          minutesPerStep,
        })}
        {stepNumber
          ? ` · etapa ${stepNumber} de ${journey.steps.length}`
          : reallyCompleted
            ? ` · ${doneCount} de ${journey.steps.length} concluídas`
            : null}
      </p>

      <JourneyProgressBar
        progress={progress}
        totalSteps={journey.steps.length}
        journeySlug={journey.slug}
        labelId="journey-detail-progress"
      />

      <p className="text-sm text-ink-soft">
        Retome quando puder — o progresso fica salvo na sua conta.
      </p>

      {reallyCompleted ? (
        <div
          className="rounded-xl border border-wine/25 bg-wine/[0.04] px-4 py-3.5"
          role="status"
        >
          <p className="text-sm font-medium text-ink">Jornada concluída</p>
          <p className="mt-1 text-sm text-ink-soft">
            Você pode rever as etapas no seu ritmo ou escolher outra jornada.
          </p>
        </div>
      ) : null}

      {currentStep && !reallyCompleted ? (
        <p className="text-sm text-ink">
          <span className="font-medium">Etapa atual:</span> {currentStep.number}
          . {currentStep.title}
        </p>
      ) : null}

      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="font-display text-lg text-ink">
          Etapas
        </h2>
        <ol className="mt-4 space-y-2">
          {journey.steps.map((step) => {
            const done = progress.completedStepIds.includes(step.id);
            const isCurrent = progress.currentStepId === step.id;
            return (
              <li key={step.id}>
                <Link
                  href={`/jornadas/${journey.slug}/${step.slug}`}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl border bg-background/70 px-4 py-3 text-sm transition hover:border-wine/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isCurrent ? visual.borderClass : "border-border/60",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      done
                        ? cn(visual.markBgClass, visual.markTextClass)
                        : "bg-border/50 text-ink-soft",
                    )}
                    aria-hidden
                  >
                    {done ? "✓" : step.number}
                  </span>
                  <span className="flex-1 text-ink">{step.title}</span>
                  <span className="text-xs text-ink-soft">
                    {step.estimatedMinutes} min
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild className="min-h-11">
          <Link href={nextHref}>
            {reallyCompleted ? "Rever Jornada" : cta}
          </Link>
        </Button>
        {reallyCompleted ? (
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/jornadas">Ver outras jornadas</Link>
          </Button>
        ) : null}
      </div>

      <div className="border-t border-border/50 pt-6">
        <p className="mb-3 text-xs text-ink-soft">
          Precisa recomeçar do zero? O reset apaga o progresso desta jornada.
        </p>
        <JourneyResetButton journeySlug={journey.slug} />
      </div>
    </div>
  );
}
