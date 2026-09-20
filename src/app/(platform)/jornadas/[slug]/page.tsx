import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { JourneyResetButton } from "@/components/journeys/journey-reset-button";
import { LockPill } from "@/components/commerce/lock-pill";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { isFeatureDisabled } from "@/config/feature-kill-switches";
import { getAuthUserContext } from "@/lib/auth";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
} from "@/lib/journeys/entitlement";
import {
  getSoftPaywallCopy,
  journeyShowsSoftPaywall,
} from "@/lib/commerce/soft-paywall";
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
  journeyIntro,
  journeyResumeHint,
} from "@/lib/journeys/presentation";
import {
  ensureJourneyStarted,
  loadJourneyProgress,
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
  const softFree = journeyShowsSoftPaywall(journeyState.state);
  if (!journeyHasEffectiveAccess(journeyState.state) && !softFree) {
    redirect(getRequiredDestinationForState(journeyState.state));
  }

  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();

  const entitled = canUseReadingJourneys(auth.planKey);
  const progress = entitled
    ? await ensureJourneyStarted(auth.userId, journey.slug)
    : await loadJourneyProgress(auth.userId, journey.slug);
  const estimatedMinutes = getJourneyEstimatedMinutes(journey);
  const minutesPerStep =
    journey.steps.length > 0
      ? Math.round(estimatedMinutes / journey.steps.length)
      : null;
  const visual = getJourneyVisual(journey.slug);
  const stepNumber = journeyCurrentStepNumber(progress, journey.steps);
  const currentStep = journey.steps.find((s) => s.id === progress.currentStepId);
  const firstStep = journey.steps[0];
  const nextHref = entitled
    ? currentStep
      ? `/jornadas/${journey.slug}/${currentStep.slug}`
      : `/jornadas/${journey.slug}/${firstStep!.slug}`
    : firstStep
      ? `/jornadas/${journey.slug}/${firstStep.slug}`
      : `/jornadas/${journey.slug}`;
  const cta = entitled
    ? journeyCtaLabel(progress, { currentStepNumber: stepNumber })
    : progress.completedStepIds.includes(firstStep?.id ?? "")
      ? "Rever Dia 1"
      : "Abrir Dia 1";
  const doneCount = progress.completedStepIds.length;
  const reallyCompleted = Boolean(progress.completedAt && progress.isCompleted);
  const paywallCopy = getSoftPaywallCopy("jornadas");

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

      <p className="text-sm leading-relaxed text-ink-soft">
        {journeyIntro(journey)}
      </p>

      <p className="text-sm text-ink-soft">
        <span className="font-medium text-ink">Objetivo:</span>{" "}
        {journey.objective}
      </p>

      <p className="text-sm text-ink-soft">
        {journeyDurationLabel({
          stepCount: journey.steps.length,
          minutesPerStep,
        })}
        {entitled && stepNumber
          ? ` · etapa ${stepNumber} de ${journey.steps.length}`
          : entitled && reallyCompleted
            ? ` · ${doneCount} de ${journey.steps.length} concluídas`
            : !entitled
              ? " · prévia: Dia 1 aberto"
              : null}
      </p>

      {entitled ? (
        <JourneyProgressBar
          progress={progress}
          totalSteps={journey.steps.length}
          journeySlug={journey.slug}
          labelId="journey-detail-progress"
        />
      ) : null}

      {entitled ? (
        <p className="text-sm text-ink">
          {journeyResumeHint(progress, journey.steps)}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">
          Viva o Dia 1 agora. Os dias seguintes pedem o plano Caminho — Essencial
          não inclui jornadas completas.
        </p>
      )}

      {entitled ? (
        <p className="text-sm text-ink-soft">
          Retome quando puder — o progresso fica salvo na sua conta.
        </p>
      ) : (
        <SoftPaywallSheet copy={paywallCopy} defaultOpen={false} />
      )}

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

      {entitled && currentStep && !reallyCompleted ? (
        <p className="text-sm text-ink">
          <span className="font-medium">Etapa atual:</span> {currentStep.number}
          . {currentStep.title}
        </p>
      ) : null}

      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="font-display text-lg text-ink">
          Dias do caminho
        </h2>
        <ol className="mt-4 space-y-2">
          {journey.steps.map((step) => {
            const done = progress.completedStepIds.includes(step.id);
            const isCurrent = progress.currentStepId === step.id;
            const unlocked = canAccessJourneyStep(auth.planKey, step.number);
            if (!unlocked) {
              return (
                <li key={step.id}>
                  <div
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm"
                    aria-disabled="true"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-border/50 text-xs font-medium text-ink-soft"
                      aria-hidden
                    >
                      {step.number}
                    </span>
                    <span className="flex-1 text-ink-soft">{step.title}</span>
                    <LockPill label="Caminho" />
                  </div>
                </li>
              );
            }
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
                    {done
                      ? "Concluída"
                      : isCurrent
                        ? "Agora"
                        : `Dia ${step.number}`}
                    {" · "}
                    {step.estimatedMinutes} min
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild variant="ritual" className="min-h-11">
          <Link href={nextHref}>
            {entitled && reallyCompleted ? "Rever Jornada" : cta}
          </Link>
        </Button>
        {reallyCompleted ? (
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/jornadas">Ver outras jornadas</Link>
          </Button>
        ) : null}
      </div>

      {entitled ? (
        <div className="border-t border-border/50 pt-6">
          <p className="mb-3 text-xs text-ink-soft">
            Precisa recomeçar do zero? O reset apaga o progresso desta jornada.
          </p>
          <JourneyResetButton journeySlug={journey.slug} />
        </div>
      ) : null}
    </div>
  );
}
