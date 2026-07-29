import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneysInicioCard } from "@/components/journeys/journeys-inicio-card";
import { ActivationSessionChecklist } from "@/components/platform/activation-session-checklist";
import { PrimaryActionCard } from "@/components/platform/primary-action-card";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { PlanStatusBadge } from "@/components/platform/plan-status-badge";
import { ProgressSteps } from "@/components/platform/progress-steps";
import { StatusCard } from "@/components/platform/status-card";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import {
  pickMostRecentInProgressJourney,
  pickPrimaryReturnTarget,
  type ReturnTargetCandidate,
} from "@/lib/conversations/return-priority";
import {
  formatConversationActivity,
  loadLatestResumePreview,
  resumeReturnCopy,
  resumeReturnTone,
} from "@/lib/conversations/resume";
import { RESPONSE_FORMAT_HINT } from "@/lib/conversations/response-format-hint";
import { getPlanByKey } from "@/lib/entitlements";
import {
  firstNameFromDisplayName,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";
import { THEME_SHORTCUTS } from "@/lib/journey/theme-shortcuts";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import { getJourneyBySlug } from "@/lib/journeys/registry";
import { buildCatalogItems, loadJourneyProgressMap } from "@/lib/journeys/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadDisplayName(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return (data?.display_name as string | null) ?? null;
  } catch {
    return null;
  }
}

function ThemeShortcutsSection({ headingId }: { headingId: string }) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="font-display text-lg text-ink">
        Temas para começar
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Escolha um tema para preencher o campo — você pode editar o texto antes
        de enviar.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {THEME_SHORTCUTS.map((theme) => (
          <li key={theme.label}>
            <Link
              href={`/conversar?tema=${encodeURIComponent(theme.prompt)}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border/70 bg-card/70 px-3.5 py-2 text-sm text-ink transition hover:border-wine/30 hover:bg-wine/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {theme.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
        {RESPONSE_FORMAT_HINT}
      </p>
    </section>
  );
}

function QuickActions({ showPersonalize = false }: { showPersonalize?: boolean }) {
  const actions = [
    {
      href: "/conversar",
      label: "Nova reflexão",
      description: "Traga outro tema",
    },
    {
      href: "/conversas",
      label: "Histórico",
      description: "Retome conversas",
    },
    {
      href: showPersonalize ? "/personalizar" : "/jornadas",
      label: showPersonalize ? "Personalizar" : "Jornadas",
      description: showPersonalize ? "Ajuste preferências" : "Siga uma trilha",
    },
  ];

  return (
    <section aria-labelledby="quick-actions-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="quick-actions-heading" className="font-display text-lg text-ink">
          Acesso rápido
        </h2>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-border/70 bg-card/70 p-3 transition hover:border-wine/25 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-sm font-medium text-ink">{action.label}</span>
              <span className="text-xs leading-tight text-ink-soft">
                {action.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function InicioPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/inicio");
  }

  const { state } = await resolveUserJourneyState();
  const displayName = await loadDisplayName(auth.userId);
  const firstName =
    firstNameFromDisplayName(displayName) ??
    firstNameFromDisplayName(auth.email?.split("@")[0] ?? null);
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";
  const plan = auth.planKey ? getPlanByKey(auth.planKey) : null;
  const allowsChat = journeyAllowsChat(state);

  let resume = null;
  if (allowsChat) {
    try {
      resume = await loadLatestResumePreview(auth.userId);
    } catch {
      resume = null;
    }
  }

  let journeyCandidate: ReturnTargetCandidate | null = null;
  if (allowsChat && canUseReadingJourneys(auth.planKey)) {
    try {
      const progressMap = await loadJourneyProgressMap(auth.userId);
      const items = buildCatalogItems(progressMap);
      const states = items
        .map((i) => i.progress)
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      const latestJourney = pickMostRecentInProgressJourney(states);
      if (latestJourney) {
        const journey = getJourneyBySlug(latestJourney.journeySlug);
        const nextStep = journey?.steps.find(
          (s) => s.id === latestJourney.currentStepId,
        );
        if (journey && latestJourney.updatedAt) {
          journeyCandidate = {
            kind: "journey",
            updatedAt: latestJourney.updatedAt,
            title: journey.title,
            subtitle: nextStep
              ? `Próxima etapa: ${nextStep.title}`
              : "Continuar no seu ritmo",
            href: nextStep
              ? `/jornadas/${journey.slug}/${nextStep.slug}`
              : `/jornadas/${journey.slug}`,
            cta: nextStep
              ? `Continuar: ${nextStep.title}`
              : "Continuar jornada",
          };
        }
      }
    } catch {
      journeyCandidate = null;
    }
  }

  if (
    state === "confirmed_without_plan" ||
    state === "ended" ||
    state === "payment_pending" ||
    state === "payment_processing"
  ) {
    const hasPendingPayment =
      state === "payment_pending" || state === "payment_processing";
    return (
      <div className="space-y-8">
        <PlatformPageHeader
          title={greeting}
          description={
            hasPendingPayment
              ? "Falta concluir o pagamento para liberar suas reflexões."
              : "Falta escolher um plano para começar a conversar."
          }
        />

        {hasPendingPayment && plan ? (
          <StatusCard
            tone="success"
            title="Plano reservado"
            body={`Seu plano ${plan.name} está reservado. Conclua o pagamento para seguir.`}
          >
            <PlanStatusBadge label={plan.name} tone="active" />
          </StatusCard>
        ) : null}

        <ProgressSteps
          steps={[
            { label: "Plano", status: "done" },
            { label: "Conta", status: "done" },
            {
              label: "Pagamento",
              status: hasPendingPayment ? "current" : "upcoming",
            },
            { label: "Personalização", status: "upcoming" },
            { label: "Primeira reflexão", status: "upcoming" },
          ]}
        />

        <PrimaryActionCard
          title={hasPendingPayment ? "Concluir assinatura" : "Escolher meu plano"}
          body={
            hasPendingPayment
              ? "Continue de onde parou. Em poucos passos você libera o chat."
              : "Escolha o plano que combina com o ritmo de reflexão que você deseja."
          }
          href={
            hasPendingPayment
              ? state === "payment_processing"
                ? "/assinatura/sucesso"
                : "/assinar/continuar"
              : "/planos"
          }
          cta={
            hasPendingPayment
              ? "Continuar para pagamento"
              : "Escolher meu plano"
          }
          tone="emphasis"
        />
      </div>
    );
  }

  if (state === "active_needs_personalization") {
    return (
      <div className="space-y-8">
        <PlatformPageHeader
          title={greeting}
          description="Seu plano está ativo. Falta só personalizar como você prefere receber as reflexões."
        />
        <StatusCard
          tone="success"
          title="Seu plano está ativo"
          body="Leva poucos instantes — tradição, estilo e profundidade."
        >
          {plan ? <PlanStatusBadge label={plan.name} tone="active" /> : null}
        </StatusCard>
        <ProgressSteps
          steps={[
            { label: "Plano", status: "done" },
            { label: "Conta", status: "done" },
            { label: "Pagamento", status: "done" },
            { label: "Personalização", status: "current" },
            { label: "Primeira reflexão", status: "upcoming" },
          ]}
        />
        <PrimaryActionCard
          title="Personalize sua experiência"
          body="Conte-nos como você prefere receber suas reflexões. Leva poucos instantes."
          href="/personalizar"
          cta="Personalizar minha experiência"
          tone="emphasis"
        />
      </div>
    );
  }

  if (state === "past_due") {
    return (
      <div className="space-y-8">
        <PlatformPageHeader
          title={greeting}
          description="Há um problema com o pagamento da sua assinatura."
        />
        <StatusCard
          tone="warning"
          title="Assinatura com pagamento pendente"
          body="Atualize a forma de pagamento na sua conta para voltar a conversar. Estamos aqui quando estiver pronto."
        />
        <PrimaryActionCard
          title="Próximo passo"
          body="Revise a assinatura e a forma de pagamento com calma."
          href="/conta"
          cta="Ir para minha conta"
          tone="emphasis"
        />
      </div>
    );
  }

  // active_ready | canceling_at_period_end
  const chatCandidate: ReturnTargetCandidate | null = resume
    ? {
        kind: "chat",
        updatedAt: resume.updatedAt,
        title: resume.title,
        subtitle: resume.preview,
        href: `/conversar?c=${resume.conversationId}`,
        cta: resumeReturnCopy(resumeReturnTone(resume.updatedAt)).cta,
      }
    : null;

  const returnSelection = pickPrimaryReturnTarget(
    [chatCandidate, journeyCandidate].filter(
      (c): c is ReturnTargetCandidate => Boolean(c),
    ),
  );

  if (!returnSelection) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
            Hoje
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {greeting}
          </h1>
          {state === "canceling_at_period_end" ? (
            <p className="mt-1 text-sm text-ink-soft">
              Seu acesso continua até o fim do período pago.
            </p>
          ) : null}
        </header>

        <section
          aria-labelledby="first-reflection-heading"
          className="rounded-3xl border border-wine/20 bg-gradient-to-br from-wine/[0.08] via-card to-sand-100/80 p-5 sm:p-7"
        >
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-wine">
            Sua primeira reflexão
          </p>
          <h2 id="first-reflection-heading" className="mt-2 font-display text-2xl text-ink">
            O que está pesando hoje?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Conte com suas palavras. Não é preciso formular uma pergunta perfeita.
          </p>
          <Button asChild className="mt-4 min-h-12 w-full bg-wine hover:bg-wine-soft sm:w-auto">
            <Link href="/conversar">Começar uma reflexão</Link>
          </Button>
        </section>

        <QuickActions showPersonalize={!auth.spiritualProfile.onboardingCompleted} />
        <ActivationSessionChecklist planKey={auth.planKey} />
        <ThemeShortcutsSection headingId="theme-shortcuts-heading" />
        <JourneysInicioCard userId={auth.userId} planKey={auth.planKey} />
      </div>
    );
  }

  const { primary, secondary } = returnSelection;
  const primaryTone =
    primary.kind === "chat" && resume
      ? resumeReturnTone(resume.updatedAt)
      : resumeReturnTone(primary.updatedAt);
  const returnCopy = resumeReturnCopy(primaryTone);
  const primaryEyebrow =
    primary.kind === "journey" ? "Retomar jornada" : returnCopy.eyebrow;
  const primaryBody =
    primary.kind === "journey"
      ? "Sua trilha guiada continua disponível. Retome a etapa atual ou abra uma conversa livre quando quiser."
      : returnCopy.body;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          Hoje
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
          {greeting}
        </h1>
        {state === "canceling_at_period_end" ? (
          <p className="mt-1 text-sm text-ink-soft">
            Seu acesso continua até o fim do período pago.
          </p>
        ) : null}
      </header>

      <section
        aria-labelledby="resume-heading"
        className="rounded-3xl border border-wine/25 bg-gradient-to-br from-wine/[0.09] via-card to-sand-100/80 p-5 sm:p-7"
      >
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          {primaryEyebrow}
        </p>
        <h2
          id="resume-heading"
          className="mt-2 font-display text-2xl text-ink sm:text-3xl"
        >
          {primary.title}
        </h2>
        <time
          dateTime={primary.updatedAt}
          className="mt-1 block text-xs text-ink-soft"
        >
          Última atividade · {formatConversationActivity(primary.updatedAt)}
        </time>
        {primary.subtitle ? (
          <p className="mt-3 line-clamp-1 max-w-xl text-sm leading-relaxed text-ink-soft">
            {primary.subtitle}
          </p>
        ) : (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            {primaryBody}
          </p>
        )}
        <Button asChild className="mt-5 min-h-12 w-full bg-wine hover:bg-wine-soft sm:w-auto">
          <Link href={primary.href}>{primary.cta}</Link>
        </Button>
        {secondary ? (
          <p className="mt-4 text-sm text-ink-soft">
            Também em andamento:{" "}
            <Link
              href={secondary.href}
              className="font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {secondary.kind === "journey"
                ? secondary.title
                : "Retomar conversa"}
            </Link>
          </p>
        ) : null}
      </section>

      <QuickActions />

      {journeyCandidate && primary.kind !== "journey" ? (
        <section
          aria-labelledby="today-journey-heading"
          className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gold">
              Jornada em andamento
            </p>
            <h2 id="today-journey-heading" className="mt-1 font-display text-lg text-ink">
              {journeyCandidate.title}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{journeyCandidate.subtitle}</p>
          </div>
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link href={journeyCandidate.href}>Continuar Jornada</Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
