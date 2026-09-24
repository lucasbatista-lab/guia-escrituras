import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { JourneyResetButton } from "@/components/journeys/journey-reset-button";
import { JourneyCoverArt } from "@/components/journeys/covers/journey-cover-art";
import { LockPill } from "@/components/commerce/lock-pill";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { Button } from "@/components/ui/button";
import { IconChevron } from "@/components/brand/icons/archive-icons";
import { isFeatureDisabled } from "@/config/feature-kill-switches";
import { getAuthUserContext } from "@/lib/auth";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
} from "@/lib/journeys/entitlement";
import {
  getSoftPaywallCopy,
  journeyShowsSoftPaywall,
  softPaywallViewerFromPlanKey,
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
  journeyShortPromise,
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
  const paywallCopy = getSoftPaywallCopy(
    "jornadas",
    softPaywallViewerFromPlanKey(auth.planKey),
  );

  const unlockedSteps = journey.steps.filter((s) =>
    canAccessJourneyStep(auth.planKey, s.number),
  );
  const lockedCount = journey.steps.length - unlockedSteps.length;

  return (
    <div className="space-y-6 pb-8">
      {/* Atmosphere cover — entering a Caminho changes the room */}
      <header className="relative -mx-1 overflow-hidden rounded-[26px] shadow-[0_20px_48px_-28px_rgba(44,36,28,0.55)]">
        <JourneyCoverArt slug={journey.slug} size="hero" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10"
        />
        <div className="absolute inset-x-0 bottom-0 space-y-2 px-5 pb-5 pt-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F0E6D0]/85">
            Caminho
            {entitled && stepNumber
              ? ` · etapa ${stepNumber} de ${journey.steps.length}`
              : entitled && reallyCompleted
                ? ` · ${doneCount} de ${journey.steps.length}`
                : !entitled
                  ? " · prévia Dia 1"
                  : null}
          </p>
          <h1 className="font-display text-[28px] leading-tight text-[#FFF9F0]">
            {journey.title}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-[#FFF9F0]/78">
            {journeyShortPromise(journey.slug)}
          </p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-ink-soft">
        {journeyIntro(journey)}
      </p>

      <p className="amem-type-meta">
        {journeyDurationLabel({
          stepCount: journey.steps.length,
          minutesPerStep,
        })}
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

      {/* Primary CTA — hub is Continuar/Começar first, not a course syllabus */}
      <div className="flex flex-col gap-3">
        <Button asChild variant="ritual" className="min-h-12 w-full text-base">
          <Link
            href={nextHref}
            className="inline-flex items-center justify-center gap-2"
          >
            {entitled && reallyCompleted ? "Rever caminho" : cta}
            <IconChevron className="size-4 opacity-90" />
          </Link>
        </Button>
        {reallyCompleted ? (
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/jornadas">Ver outros caminhos</Link>
          </Button>
        ) : null}
      </div>

      {entitled && currentStep && !reallyCompleted ? (
        <div className="amem-surface-poco">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
            Próximo momento
          </p>
          <p className="mt-2 text-sm font-medium text-ink">
            Dia {currentStep.number} · {currentStep.title}
          </p>
        </div>
      ) : null}

      {/* Secondary: compact day list — completed/locked quieter */}
      <section aria-labelledby="steps-heading" className="space-y-3">
        <h2
          id="steps-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
        >
          Dias do caminho
        </h2>
        <ol className="divide-y divide-border/40 overflow-hidden rounded-[18px] border border-border/50 bg-[color:var(--amem-surface)]/80 px-3">
          {journey.steps.map((step) => {
            const done = progress.completedStepIds.includes(step.id);
            const isCurrent = progress.currentStepId === step.id;
            const unlocked = canAccessJourneyStep(auth.planKey, step.number);
            if (!unlocked) {
              return (
                <li key={step.id}>
                  <div
                    className="flex min-h-11 items-center gap-3 py-3 text-sm opacity-70"
                    aria-disabled="true"
                  >
                    <span className="w-6 text-center text-xs text-ink-soft">
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
                    "flex min-h-11 items-center gap-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent ? "text-ink" : "text-ink-soft",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                      done
                        ? cn(visual.markBgClass, visual.markTextClass)
                        : isCurrent
                          ? "bg-wine/15 text-wine"
                          : "text-ink-soft",
                    )}
                    aria-hidden
                  >
                    {done ? "✓" : step.number}
                  </span>
                  <span className={cn("flex-1", done ? "text-ink-soft" : "text-ink")}>
                    {step.title}
                  </span>
                  <span className="text-[11px] text-ink-soft">
                    {done ? "Feito" : isCurrent ? "Agora" : `${step.estimatedMinutes} min`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {lockedCount > 0 ? (
          <p className="text-xs text-ink-soft">
            {lockedCount}{" "}
            {lockedCount === 1 ? "dia seguinte" : "dias seguintes"} no plano
            Caminho.
          </p>
        ) : null}
      </section>

      {/* Keep objective available without heavy module chrome */}
      <p className="text-sm leading-relaxed text-ink-soft">
        <span className="font-medium text-ink">Objetivo:</span>{" "}
        {journey.objective}
      </p>

      {entitled ? (
        <div className="border-t border-border/40 pt-6">
          <p className="mb-3 text-xs text-ink-soft">
            Precisa recomeçar do zero? O reset apaga o progresso desta jornada.
          </p>
          <JourneyResetButton journeySlug={journey.slug} />
        </div>
      ) : null}
    </div>
  );
}
