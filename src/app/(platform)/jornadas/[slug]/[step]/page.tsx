import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyStepCompleteButton } from "@/components/journeys/journey-step-complete-button";
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
  ensureJourneyStarted,
} from "@/lib/journeys/server";
import {
  getJourneyBySlug,
  getJourneyStep,
  getNextStepSlug,
  getPreviousStepSlug,
} from "@/lib/journeys/registry";
import {
  buildJourneyResumePath,
  buildLoginHref,
} from "@/lib/navigation/safe-next-path";

export const dynamic = "force-dynamic";

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
  if (!journeyHasEffectiveAccess(journeyState.state)) {
    redirect(getRequiredDestinationForState(journeyState.state));
  }

  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();
  const step = getJourneyStep(slug, stepSlug);
  if (!step) notFound();

  if (!canUseReadingJourneys(auth.planKey)) {
    redirect("/jornadas");
  }

  const progress = await ensureJourneyStarted(auth.userId, journey.slug);
  const stepCompleted = progress.completedStepIds.includes(step.id);
  const prevSlug = getPreviousStepSlug(slug, stepSlug);
  const nextSlug = getNextStepSlug(slug, stepSlug);
  const nextStep = nextSlug ? getJourneyStep(slug, nextSlug) : null;
  const chatHref = `/conversar?jornada=${encodeURIComponent(journey.slug)}&etapa=${encodeURIComponent(step.slug)}`;
  const isLastStep = !nextSlug;
  const totalSteps = journey.steps.length;

  return (
    <article className="space-y-8 pb-32">
      <nav className="text-sm text-ink-soft">
        <Link href="/jornadas" className="underline underline-offset-4">
          Jornadas
        </Link>
        <span aria-hidden> · </span>
        <Link
          href={`/jornadas/${journey.slug}`}
          className="underline underline-offset-4"
        >
          {journey.title}
        </Link>
      </nav>

      <PlatformPageHeader
        title={step.title}
        description={`Etapa ${step.number} de ${totalSteps} · ~${step.estimatedMinutes} min nesta etapa${
          stepCompleted ? " · concluída" : ""
        }`}
      />

      <p className="text-sm text-ink-soft">
        O progresso fica salvo — você pode pausar e retomar quando quiser.
      </p>

      {/* 1. Passagem / referência */}
      <section
        aria-labelledby="step-escritura-heading"
        className="border-l-2 border-wine/30 pl-4"
      >
        <h2
          id="step-escritura-heading"
          className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft"
        >
          Escritura
        </h2>
        <p className="mt-2 font-display text-lg text-ink">
          {step.bibleReference}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {step.paraphrase}
        </p>
      </section>

      {/* 2. Reflexão */}
      <section aria-labelledby="step-reflexao-heading">
        <h2
          id="step-reflexao-heading"
          className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft"
        >
          Reflexão
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {step.reflection}
        </p>
      </section>

      {/* 3. Aplicação prática */}
      <section
        aria-labelledby="step-acao-heading"
        className="rounded-xl border border-gold/25 bg-sand-100/40 px-4 py-4"
      >
        <h2
          id="step-acao-heading"
          className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft"
        >
          Ação prática
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {step.practicalAction}
        </p>
      </section>

      {/* 4. Pergunta para conversar */}
      <section aria-labelledby="step-pergunta-heading">
        <h2
          id="step-pergunta-heading"
          className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft"
        >
          Para conversar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {step.personalQuestion}
        </p>
        <div className="mt-4">
          <Button asChild variant="outline" className="min-h-11">
            <Link href={chatHref}>Conversar sobre esta etapa</Link>
          </Button>
        </div>
      </section>

      {step.safetyNote ? (
        <div className="rounded-xl border border-border/70 bg-sand-50/80 p-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
            Cuidado
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {step.safetyNote}
          </p>
        </div>
      ) : null}

      {/* 5. Conclusão da etapa */}
      <section
        aria-labelledby="step-conclusao-heading"
        className="space-y-3 border-t border-border/60 pt-6"
      >
        <h2
          id="step-conclusao-heading"
          className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft"
        >
          Conclusão da etapa
        </h2>
        <JourneyStepCompleteButton
          journeySlug={journey.slug}
          stepId={step.id}
          completed={stepCompleted}
          nextStepHref={
            nextSlug ? `/jornadas/${journey.slug}/${nextSlug}` : null
          }
          nextStepLabel={nextStep?.title ?? null}
          journeyHref={`/jornadas/${journey.slug}`}
          isLastStep={isLastStep}
          journeyCompleted={progress.isCompleted}
        />
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={`/jornadas/${journey.slug}`}>Voltar à jornada</Link>
        </Button>
      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border/70 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
        aria-label="Navegação entre etapas"
      >
        <div className="mx-auto flex max-w-5xl gap-2">
          {prevSlug ? (
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href={`/jornadas/${journey.slug}/${prevSlug}`}>
                Etapa anterior
              </Link>
            </Button>
          ) : (
            <span className="flex-1" />
          )}
          {nextSlug ? (
            <Button asChild className="min-h-11 flex-1">
              <Link href={`/jornadas/${journey.slug}/${nextSlug}`}>
                Próxima etapa
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href="/inicio">Voltar ao início</Link>
            </Button>
          )}
        </div>
      </nav>
    </article>
  );
}
