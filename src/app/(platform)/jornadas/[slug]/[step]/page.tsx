import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JourneyStepCompleteButton } from "@/components/journeys/journey-step-complete-button";
import { SoftPaywallGate } from "@/components/commerce/soft-paywall-gate";
import { Button } from "@/components/ui/button";
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
  journeyDayLabel,
  stepClosing,
  stepPrayer,
} from "@/lib/journeys/presentation";
import {
  buildJourneyResumePath,
  buildLoginHref,
} from "@/lib/navigation/safe-next-path";
import { loadJourneyStepNote } from "@/lib/workspace/entries";
import { cn } from "@/lib/utils";

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
    return <SoftPaywallGate resource="jornadas" />;
  }

  const progress = await ensureJourneyStarted(auth.userId, journey.slug);
  const personalNote = await loadJourneyStepNote(auth.userId, journey.slug, step.id);
  const stepCompleted = progress.completedStepIds.includes(step.id);
  const prevSlug = getPreviousStepSlug(slug, stepSlug);
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

  return (
    <article className="space-y-6 pb-36">
      <nav className="text-sm text-ink-soft">
        <Link href="/jornadas" className="underline underline-offset-4">
          Caminhos
        </Link>
        <span aria-hidden> · </span>
        <Link
          href={`/jornadas/${journey.slug}`}
          className="underline underline-offset-4"
        >
          {journey.title}
        </Link>
      </nav>

      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-brass)]">
          {journey.title}
        </p>
        <h1 className="font-display text-[28px] leading-tight text-ink">
          {journeyDayLabel(step.number, totalSteps)} · {step.title}
        </h1>
        <p className="text-sm text-ink-soft">
          ~{step.estimatedMinutes} min
          {stepCompleted ? " · concluído" : ""}
          {" · "}
          progresso salvo — retome quando quiser
        </p>
      </header>

      <ol
        className="flex items-center gap-1.5"
        aria-label={`Progresso: dia ${step.number} de ${totalSteps}`}
      >
        {journey.steps.map((s) => {
          const done = progress.completedStepIds.includes(s.id);
          const current = s.id === step.id;
          return (
            <li key={s.id} className="flex-1">
              <span
                className={cn(
                  "block h-[3.5px] rounded-full",
                  done
                    ? "bg-[image:var(--amem-trilho)]"
                    : current
                      ? "bg-wine"
                      : "bg-[color:var(--amem-trilho-track)] opacity-50",
                )}
                style={
                  done
                    ? {
                        background:
                          "linear-gradient(90deg, var(--amem-wine-deep), var(--amem-wine) 55%, var(--amem-plum))",
                      }
                    : undefined
                }
                title={`Dia ${s.number}`}
              />
            </li>
          );
        })}
      </ol>

      <section
        aria-labelledby="step-cena-heading"
        className="amem-surface-poco relative"
      >
        <h2
          id="step-cena-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
        >
          Contexto
        </h2>
        <p className="mt-3 font-display text-lg leading-snug text-ink">
          {step.objective}
        </p>
      </section>

      <section
        aria-labelledby="step-escritura-heading"
        className="amem-lex-scripture"
      >
        <h2
          id="step-escritura-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
        >
          Passagem
        </h2>
        <p className="mt-2 font-display text-lg text-ink">{step.bibleReference}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {step.paraphrase}
        </p>
        <div className="amem-lex-scripture-ref">Em outras palavras · não é citação inventada</div>
      </section>

      <section aria-labelledby="step-reflexao-heading" className="space-y-2">
        <h2
          id="step-reflexao-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-plum)]"
        >
          Reflexão
        </h2>
        <p className="text-[15px] leading-relaxed text-ink">{step.reflection}</p>
      </section>

      <section
        aria-labelledby="step-pergunta-heading"
        className="border-l-[2.5px] border-wine/40 pl-4"
      >
        <h2
          id="step-pergunta-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
        >
          Pergunta
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          {step.personalQuestion}
        </p>
      </section>

      <section
        aria-labelledby="step-oracao-heading"
        className="rounded-[18px] bg-[color:var(--amem-surface)] px-4 py-4 shadow-[inset_0_0_0_1px_var(--amem-hairline)]"
      >
        <h2
          id="step-oracao-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine"
        >
          Oração
        </h2>
        <p className="mt-2 font-display text-[17px] italic leading-snug text-ink">
          {stepPrayer(step)}
        </p>
      </section>

      <section aria-labelledby="step-acao-heading" className="space-y-2">
        <h2
          id="step-acao-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
        >
          Prática
        </h2>
        <p className="text-sm leading-relaxed text-ink">{step.practicalAction}</p>
      </section>

      <section
        aria-labelledby="step-fecho-heading"
        className="rounded-[18px] border border-[rgba(184,150,90,0.28)] bg-[color:var(--amem-recess)]/55 px-4 py-4"
      >
        <h2
          id="step-fecho-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-brass)]"
        >
          Fecho · Levo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">{stepClosing(step)}</p>
      </section>

      <section aria-labelledby="step-conversar-heading" className="space-y-3">
        <h2
          id="step-conversar-heading"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
        >
          Para conversar
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Se quiser continuar, o chat recebe só o contexto editorial desta etapa —
          não envia anotações pessoais.
        </p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={chatHref}>Conversar sobre esta reflexão</Link>
        </Button>
      </section>

      <JourneyStepNote
        journeySlug={journey.slug}
        stepId={step.id}
        initial={personalNote}
      />

      {step.safetyNote ? (
        <div className="rounded-xl border border-border/70 bg-[color:var(--amem-surface)] p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Cuidado
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {step.safetyNote}
          </p>
        </div>
      ) : null}

      <section
        aria-labelledby="step-conclusao-heading"
        className="space-y-3 border-t border-border/60 pt-6"
      >
        <h2 id="step-conclusao-heading" className="sr-only">
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
        <p className="text-center text-xs text-ink-soft">
          Sem culpa se voltar depois — o próximo dia espera no seu ritmo.
        </p>
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={`/jornadas/${journey.slug}`}>Voltar ao caminho</Link>
        </Button>
      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border/70 bg-[color:var(--amem-surface)]/95 px-4 py-3 pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] backdrop-blur-sm md:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="Navegação entre dias"
      >
        <div className="mx-auto flex max-w-5xl gap-2 md:max-w-3xl">
          {prevSlug ? (
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href={`/jornadas/${journey.slug}/${prevSlug}`}>
                Dia anterior
              </Link>
            </Button>
          ) : (
            <span className="flex-1" />
          )}
          {nextSlug ? (
            <Button asChild variant="ritual" className="min-h-11 flex-1">
              <Link href={`/jornadas/${journey.slug}/${nextSlug}`}>
                {nextIsLockedPreview ? "Continuar caminho" : "Próximo dia"}
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
