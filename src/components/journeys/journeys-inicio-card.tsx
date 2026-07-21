import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PlanKey } from "@/lib/entitlements";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import { buildCatalogItems, loadJourneyProgressMap } from "@/lib/journeys/server";
import { journeyStatusLabel } from "@/lib/journeys/display";

export async function JourneysInicioCard({
  userId,
  planKey,
}: {
  userId: string;
  planKey: PlanKey | null;
}) {
  const entitled = canUseReadingJourneys(planKey);
  const progressMap = entitled
    ? await loadJourneyProgressMap(userId)
    : new Map();
  const items = buildCatalogItems(progressMap);
  const started = items.filter((i) => i.progress?.isStarted).length;
  const completed = items.filter((i) => i.progress?.isCompleted).length;
  const inProgress = items.find(
    (i) => i.progress?.isStarted && !i.progress.isCompleted,
  );
  const nextStep = inProgress
    ? inProgress.journey.steps.find(
        (s) => s.id === inProgress.progress?.currentStepId,
      )
    : undefined;
  const continueHref = inProgress
    ? nextStep
      ? `/jornadas/${inProgress.journey.slug}/${nextStep.slug}`
      : `/jornadas/${inProgress.journey.slug}`
    : "/jornadas";
  const continueLabel = nextStep
    ? `Continuar: ${nextStep.title}`
    : inProgress
      ? "Continuar jornada"
      : "Ver jornadas";

  return (
    <section
      aria-labelledby="journeys-inicio-heading"
      className="rounded-2xl border border-border/70 bg-card/60 p-5"
    >
      <h2 id="journeys-inicio-heading" className="font-display text-lg text-ink">
        Jornadas de leitura
      </h2>
      {entitled ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Trilhas editoriais de sete etapas sobre temas reais — no seu ritmo,
            sem obrigação diária.
          </p>
          {inProgress ? (
            <div className="mt-3 rounded-xl border border-wine/25 bg-wine/[0.04] px-3.5 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-wine">
                Em andamento
              </p>
              <p className="mt-1 font-medium text-ink">
                {inProgress.journey.title}
              </p>
              {nextStep ? (
                <p className="mt-1 text-sm text-ink-soft">
                  Próxima etapa: {nextStep.title}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-soft">
                  {journeyStatusLabel(inProgress.progress)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-soft">
              {started > 0
                ? `${started} iniciada(s) · ${completed} concluída(s)`
                : "Nenhuma jornada iniciada ainda — escolha um tema para começar."}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
              <Link href={continueHref}>{continueLabel}</Link>
            </Button>
            {inProgress ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/jornadas">Ver todas</Link>
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Trilhas guiadas sobre ansiedade, perdão, recomeço e outros temas —
            incluídas no Caminho e planos superiores.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/planos#comparar-uso">Comparar planos</Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
