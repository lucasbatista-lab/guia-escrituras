import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneysInicioCard } from "@/components/journeys/journeys-inicio-card";
import { PrimaryActionCard } from "@/components/platform/primary-action-card";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { PlanStatusBadge } from "@/components/platform/plan-status-badge";
import { ProgressSteps } from "@/components/platform/progress-steps";
import { StatusCard } from "@/components/platform/status-card";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
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
  if (!resume) {
    return (
      <div className="space-y-8">
        <PlatformPageHeader
          title={greeting}
          description={
            state === "canceling_at_period_end"
              ? "Sua renovação está cancelada, mas o acesso continua até o fim do período."
              : undefined
          }
          actions={
            plan ? (
              <PlanStatusBadge label={`Plano ${plan.name}`} tone="neutral" />
            ) : null
          }
        />

        <section aria-labelledby="first-reflection-heading" className="space-y-4">
          <h2
            id="first-reflection-heading"
            className="font-display text-2xl text-ink sm:text-3xl"
          >
            O que está pesando hoje?
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-ink-soft">
            Você pode escrever com suas próprias palavras ou começar por um dos
            temas abaixo. Não é necessário formular uma pergunta perfeita.
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
            Você pode falar sobre trabalho, dinheiro, família, relacionamentos,
            culpa, ansiedade, decisões ou silêncio espiritual.
          </p>
          <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
            <Link href="/conversar">Escrever minha situação</Link>
          </Button>
        </section>

        <ThemeShortcutsSection headingId="theme-shortcuts-heading" />

        <JourneysInicioCard userId={auth.userId} planKey={auth.planKey} />

        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/conta">Ver assinatura</Link>
          </Button>
          <Link
            href="/conversas"
            className="underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Ver conversas anteriores
          </Link>
        </div>
      </div>
    );
  }

  const latest = resume;
  const returnCopy = resumeReturnCopy(resumeReturnTone(latest.updatedAt));

  return (
    <div className="space-y-8">
      <PlatformPageHeader
        title={greeting}
        description={
          state === "canceling_at_period_end"
            ? "Sua renovação está cancelada, mas o acesso continua até o fim do período. Traga sua situação com calma."
            : "Traga sua situação e receba uma reflexão baseada nas Escrituras."
        }
        actions={
          plan ? (
            <PlanStatusBadge label={`Plano ${plan.name}`} tone="neutral" />
          ) : null
        }
      />

      <section
        aria-labelledby="resume-heading"
        className="rounded-2xl border border-wine/25 bg-gradient-to-br from-wine/[0.07] via-card/80 to-sand-100/80 p-6 sm:p-7"
      >
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          {returnCopy.eyebrow}
        </p>
        <h2
          id="resume-heading"
          className="mt-2 font-display text-xl text-ink sm:text-2xl"
        >
          {returnCopy.title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          {returnCopy.body}
        </p>
        <div className="mt-4 rounded-xl border border-border/60 bg-card/70 px-4 py-3">
          <p className="font-medium text-ink">{latest.title}</p>
          <time
            dateTime={latest.updatedAt}
            className="mt-1 block text-xs text-ink-soft"
          >
            {formatConversationActivity(latest.updatedAt)}
          </time>
          {latest.preview ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
              {latest.preview}
            </p>
          ) : null}
        </div>
        <Button asChild className="mt-6 min-h-11 bg-ink hover:bg-ink/90">
          <Link href={`/conversar?c=${latest.conversationId}`}>
            {returnCopy.cta}
          </Link>
        </Button>
      </section>

      <PrimaryActionCard
        title="Começar uma nova reflexão"
        body="Abra uma conversa nova quando quiser trazer outro tema — você não precisa continuar só a anterior."
        href="/conversar"
        cta="Começar uma nova reflexão"
        tone="default"
      />

      <ThemeShortcutsSection headingId="theme-shortcuts-heading" />

      <JourneysInicioCard userId={auth.userId} planKey={auth.planKey} />

      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/conta">Ver assinatura</Link>
        </Button>
        <Link
          href="/conversas"
          className="underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Ver conversas anteriores
        </Link>
      </div>
    </div>
  );
}
