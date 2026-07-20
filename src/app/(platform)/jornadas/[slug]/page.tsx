import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { JourneyResetButton } from "@/components/journeys/journey-reset-button";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";
import {
  ensureJourneyStarted,
} from "@/lib/journeys/server";
import {
  getJourneyBySlug,
  getJourneyEstimatedMinutes,
} from "@/lib/journeys/registry";

export const dynamic = "force-dynamic";

export default async function JornadaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/jornadas");
  }

  const journeyState = await resolveUserJourneyState({ userId: auth.userId });
  if (!journeyHasEffectiveAccess(journeyState.state)) {
    redirect(getRequiredDestinationForState(journeyState.state));
  }

  const { slug } = await params;
  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();

  if (!canUseReadingJourneys(auth.planKey)) {
    redirect("/jornadas");
  }

  const progress = await ensureJourneyStarted(auth.userId, journey.slug);
  const estimatedMinutes = getJourneyEstimatedMinutes(journey);
  const currentStep = journey.steps.find((s) => s.id === progress.currentStepId);
  const nextHref = currentStep
    ? `/jornadas/${journey.slug}/${currentStep.slug}`
    : progress.isCompleted
      ? `/jornadas/${journey.slug}/${journey.steps[0]!.slug}`
      : `/jornadas/${journey.slug}/${journey.steps[0]!.slug}`;

  return (
    <div className="space-y-8">
      <PlatformPageHeader title={journey.title} description={journey.description} />

      <p className="text-sm text-ink-soft">
        <span className="font-medium text-ink">Objetivo:</span> {journey.objective}
      </p>
      <p className="text-sm text-ink-soft">
        7 etapas · ~{estimatedMinutes} min de leitura no total
      </p>

      <JourneyProgressBar
        progress={progress}
        totalSteps={journey.steps.length}
        labelId="journey-detail-progress"
      />

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
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm transition hover:border-wine/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      done
                        ? "bg-wine/15 text-wine"
                        : "bg-border/50 text-ink-soft"
                    }`}
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

      <div className="flex flex-wrap gap-3">
        <Button asChild className="min-h-11">
          <Link href={nextHref}>
            {progress.isCompleted ? "Rever etapas" : "Continuar leitura"}
          </Link>
        </Button>
        <JourneyResetButton journeySlug={journey.slug} />
      </div>
    </div>
  );
}
