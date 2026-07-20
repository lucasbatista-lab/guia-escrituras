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
          <p className="mt-2 text-xs text-ink-soft">
            {started > 0
              ? `${started} iniciada(s) · ${completed} concluída(s)`
              : "Nenhuma jornada iniciada ainda"}
            {inProgress
              ? ` · em andamento: ${inProgress.journey.title} (${journeyStatusLabel(inProgress.progress)})`
              : ""}
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" className="min-h-11">
              <Link href={inProgress ? `/jornadas/${inProgress.journey.slug}` : "/jornadas"}>
                {inProgress ? "Continuar jornada" : "Ver jornadas"}
              </Link>
            </Button>
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
