import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyStepCompleteButton } from "@/components/journeys/journey-step-complete-button";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
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
  getPreviousStepSlug,
} from "@/lib/journeys/registry";

export const dynamic = "force-dynamic";

export default async function JornadaStepPage({
  params,
}: {
  params: Promise<{ slug: string; step: string }>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/jornadas");
  }

  const journeyState = await resolveUserJourneyState({ userId: auth.userId });
  if (!journeyHasEffectiveAccess(journeyState.state)) {
    redirect(getRequiredDestinationForState(journeyState.state));
  }

  const { slug, step: stepSlug } = await params;
  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();
  const step = getJourneyStep(slug, stepSlug);
  if (!step) notFound();

  if (!canUseReadingJourneys(auth.planKey)) {
    redirect("/jornadas");
  }

  await ensureJourneyStarted(auth.userId, journey.slug);
  const prevSlug = getPreviousStepSlug(slug, stepSlug);
  const nextSlug = getNextStepSlug(slug, stepSlug);
  const chatHref = `/conversar?jornada=${encodeURIComponent(journey.slug)}&etapa=${encodeURIComponent(step.slug)}`;

  return (
    <article className="space-y-8 pb-24">
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
        description={`Etapa ${step.number} de 7 · ${step.estimatedMinutes} min`}
      />

      <p className="text-sm text-ink-soft">
        <span className="font-medium text-ink">Referência:</span>{" "}
        {step.bibleReference}
      </p>

      <section className="space-y-4 text-sm leading-relaxed text-ink-soft">
        <div>
          <h2 className="font-medium text-ink">Paráfrase</h2>
          <p className="mt-2">{step.paraphrase}</p>
        </div>
        <div>
          <h2 className="font-medium text-ink">Reflexão</h2>
          <p className="mt-2">{step.reflection}</p>
        </div>
        <div>
          <h2 className="font-medium text-ink">Para refletir</h2>
          <p className="mt-2">{step.personalQuestion}</p>
        </div>
        <div>
          <h2 className="font-medium text-ink">Ação prática</h2>
          <p className="mt-2">{step.practicalAction}</p>
        </div>
        {step.safetyNote ? (
          <div className="rounded-xl border border-border/70 bg-sand-50/80 p-4">
            <h2 className="font-medium text-ink">Cuidado</h2>
            <p className="mt-2">{step.safetyNote}</p>
          </div>
        ) : null}
      </section>

      <JourneyStepCompleteButton journeySlug={journey.slug} stepId={step.id} />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button asChild variant="outline" className="min-h-11">
          <Link href={chatHref}>Conversar sobre esta etapa</Link>
        </Button>
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={`/jornadas/${journey.slug}`}>Voltar à jornada</Link>
        </Button>
      </div>

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
          ) : null}
        </div>
      </nav>
    </article>
  );
}
