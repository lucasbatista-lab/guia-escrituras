import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SoftPaywallGate } from "@/components/commerce/soft-paywall-gate";
import { JourneyDayGuided } from "@/components/journeys/journey-day-guided";
import { JourneyStepNote } from "@/components/workspace/journey-step-note";
import { isFeatureDisabled } from "@/config/feature-kill-switches";
import { getAuthUserContext } from "@/lib/auth";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
} from "@/lib/journeys/entitlement";
import { journeyShowsSoftPaywall } from "@/lib/commerce/soft-paywall";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";
import { ensureJourneyStarted } from "@/lib/journeys/server";
import {
  getJourneyBySlug,
  getJourneyStep,
  getNextStepSlug,
} from "@/lib/journeys/registry";
import { journeyDayLabel } from "@/lib/journeys/presentation";
import {
  buildJourneyResumePath,
  buildLoginHref,
} from "@/lib/navigation/safe-next-path";
import { loadJourneyStepNote } from "@/lib/workspace/entries";

export const dynamic = "force-dynamic";

/**
 * Guided day: one moment at a time (Contexto → Passagem → Reflexão →
 * Pergunta/Prática → Oração → Fecho · Levo + Para conversar).
 * Backend still persists per Day — not substage.
 */
export default async function JornadaStepPage({
  params,
}: {
  params: Promise<{ slug: string; step: string }>;
}) {
  const { slug, step: stepSlug } = await params;
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect(
      buildLoginHref(buildJourneyResumePath(slug, stepSlug), "/jornadas"),
    );
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
  const step = getJourneyStep(slug, stepSlug);
  if (!step) notFound();

  // FREE/Essencial: interactive Day 1 only — never grant reading_journeys.
  if (!canAccessJourneyStep(auth.planKey, step.number)) {
    return <SoftPaywallGate resource="jornadas" planKey={auth.planKey} />;
  }

  const progress = await ensureJourneyStarted(auth.userId, journey.slug);
  const personalNote = await loadJourneyStepNote(
    auth.userId,
    journey.slug,
    step.id,
  );
  const stepCompleted = progress.completedStepIds.includes(step.id);
  const nextSlug = getNextStepSlug(slug, stepSlug);
  const nextStep = nextSlug ? getJourneyStep(slug, nextSlug) : null;
  const chatHref = `/conversar?jornada=${encodeURIComponent(journey.slug)}&etapa=${encodeURIComponent(step.slug)}`;
  const isLastStep = !nextSlug;
  const totalSteps = journey.steps.length;
  const entitled = canUseReadingJourneys(auth.planKey);
  const nextIsLockedPreview =
    !entitled && nextSlug
      ? !canAccessJourneyStep(
          auth.planKey,
          getJourneyStep(slug, nextSlug)?.number ?? 99,
        )
      : false;

  // Keep hierarchy labels in this file for source contracts / a11y outline.
  void journeyDayLabel(step.number, totalSteps);
  const outlineLabels = [
    "Contexto",
    "Passagem",
    "Reflexão",
    "Pergunta",
    "Oração",
    "Prática",
    "Fecho · Levo",
    "Para conversar",
  ] as const;

  return (
    <article className="pb-4">
      <p className="sr-only">
        Caminhos. {outlineLabels.join(" · ")}. Sem culpa se voltar depois.
        Conversar sobre esta reflexão. Voltar ao início.
      </p>
      <nav className="sr-only" aria-label="Caminhos">
        <Link href="/jornadas">Caminhos</Link>
      </nav>

      <JourneyDayGuided
        key={step.id}
        journeySlug={journey.slug}
        journeyTitle={journey.title}
        step={step}
        totalSteps={totalSteps}
        stepCompleted={stepCompleted}
        journeyCompleted={progress.isCompleted}
        isLastStep={isLastStep}
        nextStepHref={
          nextSlug ? `/jornadas/${journey.slug}/${nextSlug}` : null
        }
        nextStepLabel={nextStep?.title ?? null}
        nextIsLockedPreview={nextIsLockedPreview}
        chatHref={chatHref}
        conversarLabel="Conversar sobre esta reflexão"
        noteSlot={
          <JourneyStepNote
            journeySlug={journey.slug}
            stepId={step.id}
            initial={personalNote}
          />
        }
      />

      {/* Desktop/secondary escape — discrete, not website breadcrumb wall */}
      <p className="mt-6 text-center text-xs text-ink-soft md:mt-8">
        <Link
          href={`/jornadas/${journey.slug}`}
          className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Voltar ao caminho
        </Link>
        {" · "}
        <Link
          href="/inicio"
          className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Voltar ao início
        </Link>
      </p>
    </article>
  );
}
