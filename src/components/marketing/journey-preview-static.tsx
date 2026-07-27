import { getJourneyBySlug } from "@/lib/journeys/registry";
import { cn } from "@/lib/utils";

const PREVIEW_JOURNEY_SLUG = "ansiedade-confianca" as const;
/** Illustrative progress: 2 done → current step 3 of 7 (coherent with product). */
const PREVIEW_COMPLETED = 2;
const PREVIEW_STEP_NUMBER = 3;

/**
 * Static product proof for marketing landings.
 * Reads real journey registry content — no Supabase, no user data.
 */
export function JourneyPreviewStatic({
  className,
  headingId = "journey-preview-heading",
}: {
  className?: string;
  headingId?: string;
}) {
  const journey = getJourneyBySlug(PREVIEW_JOURNEY_SLUG);
  if (!journey) return null;

  const totalSteps = journey.steps.length;
  const step =
    journey.steps.find((s) => s.number === PREVIEW_STEP_NUMBER) ??
    journey.steps[0]!;
  const percent = Math.round((PREVIEW_COMPLETED / totalSteps) * 100);
  const reflectionSummary = summarizeReflection(step.reflection);

  return (
    <section
      className={cn("scroll-mt-24", className)}
      aria-labelledby={headingId}
    >
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
          Demonstração de produto
        </p>
        <h2
          id={headingId}
          className="mt-2 font-display text-3xl text-ink sm:text-4xl"
        >
          Como uma Jornada aparece na prática
        </h2>
        <p className="mt-3 text-ink-soft">
          Exemplo estático com conteúdo editorial real — sem conta e sem dados
          de usuário. O progresso fica salvo para quem tem acesso às Jornadas.
        </p>
      </div>

      <article
        className="mt-8 min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm"
        aria-label={`Prévia da jornada ${journey.title}`}
      >
        <div className="border-b border-border/70 bg-sand-100/50 px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-wine">
            Jornada · {totalSteps} etapas
          </p>
          <h3 className="mt-2 font-display text-2xl text-ink">{journey.title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            {journey.objective}
          </p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-soft">
                {PREVIEW_COMPLETED} de {totalSteps} etapas · em andamento
              </span>
              <span className="font-medium text-ink" aria-hidden>
                {percent}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-border/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`Progresso ilustrativo: ${PREVIEW_COMPLETED} de ${totalSteps} etapas`}
            >
              <div
                className="h-full rounded-full bg-wine/70"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
              Etapa {step.number} de {totalSteps}
            </p>
            <h4 className="mt-1 font-display text-xl text-ink">{step.title}</h4>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-soft">
              Escritura
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {step.bibleReference}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-soft">
              Reflexão
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {reflectionSummary}
            </p>
          </div>

          <div className="rounded-xl border border-gold/25 bg-sand-100/40 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-soft">
              Ação prática
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">
              {step.practicalAction}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-ink-soft">
            Prévia ilustrativa. No produto, o progresso fica salvo na sua conta —
            você retoma quando puder, sem sequência diária obrigatória.
          </p>
        </div>
      </article>
    </section>
  );
}

function summarizeReflection(text: string): string {
  const firstSentence = text.split(/(?<=\.)\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 220) {
    return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
  }
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
}
