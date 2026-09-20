import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyHomeSection } from "@/components/daily/daily-home-section";
import { InicioLiving } from "@/components/inicio/inicio-living";
import { JourneysInicioCard } from "@/components/journeys/journeys-inicio-card";
import { PersonalSpaceCard } from "@/components/workspace/personal-space-card";
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

  if (state === "payment_pending" || state === "payment_processing") {
    return (
      <div className="space-y-8">
        <PlatformPageHeader
          title={greeting}
          description="Falta concluir o pagamento para liberar suas reflexões."
        />

        {plan ? (
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
            { label: "Pagamento", status: "current" },
            { label: "Personalização", status: "upcoming" },
            { label: "Primeira reflexão", status: "upcoming" },
          ]}
        />

        <PrimaryActionCard
          title="Concluir assinatura"
          body="Continue de onde parou. Em poucos passos você libera o chat."
          href={
            state === "payment_processing"
              ? "/assinatura/sucesso"
              : "/assinar/continuar"
          }
          cta="Continuar para pagamento"
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
        <DailyHomeSection userId={auth.userId} allowsChat={false} />
        <PersonalSpaceCard userId={auth.userId} />
      </div>
    );
  }

  if (state === "past_due") {
    return (
      <div className="space-y-8">
        <PlatformPageHeader
          title={greeting}
          description="Há um problema com o pagamento da sua assinatura. O conteúdo de hoje continua aqui."
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
        <DailyHomeSection userId={auth.userId} allowsChat={false} />
        <PersonalSpaceCard userId={auth.userId} />
      </div>
    );
  }

  if (state === "confirmed_without_plan" || state === "ended") {
    return (
      <InicioLiving
        greeting={greeting}
        allowsChat={false}
        userId={auth.userId}
      />
    );
  }

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
      <InicioLiving
        greeting={greeting}
        allowsChat={allowsChat}
        userId={auth.userId}
        planLabel={plan?.name ?? (allowsChat ? "Ativo" : null)}
        journeyTitle={journeyCandidate?.title ?? null}
        journeySubtitle={journeyCandidate?.subtitle ?? null}
        journeyHref={journeyCandidate?.href ?? null}
      />
    );
  }

  const { primary, secondary } = returnSelection;
  const chatPrimary = primary.kind === "chat" ? primary : secondary?.kind === "chat" ? secondary : null;
  const journeyPrimary =
    primary.kind === "journey"
      ? primary
      : secondary?.kind === "journey"
        ? secondary
        : journeyCandidate;

  return (
    <InicioLiving
      greeting={greeting}
      allowsChat={allowsChat}
      userId={auth.userId}
      planLabel={plan?.name ?? "Ativo"}
      journeyTitle={journeyPrimary?.title ?? null}
      journeySubtitle={journeyPrimary?.subtitle ?? null}
      journeyHref={journeyPrimary?.href ?? null}
      chatTitle={chatPrimary?.title ?? resume?.title ?? null}
      chatHref={chatPrimary?.href ?? (resume ? `/conversar?c=${resume.conversationId}` : null)}
      chatPreview={
        chatPrimary?.subtitle ?? resume?.preview ?? null
      }
    />
  );
}
