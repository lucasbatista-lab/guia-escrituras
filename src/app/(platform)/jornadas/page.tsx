import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneyCatalogBeacon } from "@/components/journeys/journey-catalog-beacon";
import { JourneyProgressBar } from "@/components/journeys/journey-progress-bar";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import {
  journeyCtaLabel,
  journeyStatusLabel,
} from "@/lib/journeys/display";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";
import { buildCatalogItems, loadJourneyProgressMap } from "@/lib/journeys/server";

export const dynamic = "force-dynamic";

export default async function JornadasPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/jornadas");
  }

  const journey = await resolveUserJourneyState({ userId: auth.userId });
  if (!journeyHasEffectiveAccess(journey.state)) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  const entitled = canUseReadingJourneys(auth.planKey);
  const progressMap = entitled
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

      {!entitled ? (
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
          const status = journeyStatusLabel(progress);
          const cta = journeyCtaLabel(progress);
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
              className="flex flex-col rounded-2xl border border-border/70 bg-card/60 p-5"
            >
              <h2 className="font-display text-xl text-ink">{j.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {j.description}
              </p>
              <p className="mt-3 text-xs text-ink-soft">
                7 etapas · ~{estimatedMinutes} min · {status}
              </p>
              {entitled && progress ? (
                <div className="mt-4">
                  <JourneyProgressBar
                    progress={progress}
                    totalSteps={j.steps.length}
                    labelId={`progress-${j.slug}`}
                  />
                </div>
              ) : null}
              {entitled ? (
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
