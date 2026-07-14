import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformActionCard } from "@/components/platform/action-card";
import { getAuthUserContext } from "@/lib/auth";
import { getPlanByKey } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import {
  firstNameFromDisplayName,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";
import { getRepositories } from "@/lib/database/repositories";
import { createClient } from "@/lib/supabase/server";

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

export default async function InicioPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/inicio");
  }

  const { state } = await resolveUserJourneyState({ userId: auth.userId });
  const displayName = await loadDisplayName(auth.userId);
  const firstName =
    firstNameFromDisplayName(displayName) ??
    firstNameFromDisplayName(auth.email?.split("@")[0] ?? null);
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";
  const plan = auth.planKey ? getPlanByKey(auth.planKey) : null;
  const allowsChat = journeyAllowsChat(state);

  let recentConversation: { id: string; title: string | null } | null = null;
  if (allowsChat) {
    try {
      const repos = getRepositories();
      const list = await repos.conversations.listForUser(auth.userId, 1);
      const first = list[0];
      if (first) {
        recentConversation = { id: first.id, title: first.title };
      }
    } catch {
      recentConversation = null;
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
        <div>
          <h1 className="font-display text-3xl text-ink">{greeting}</h1>
          <p className="mt-2 max-w-2xl text-ink-soft" aria-live="polite">
            {hasPendingPayment
              ? "Seu plano está reservado. Conclua o pagamento para liberar o chat."
              : "Não há plano gratuito. Escolha um plano para começar a conversar."}
          </p>
        </div>
        <PlatformActionCard
          title={hasPendingPayment ? "Concluir assinatura" : "Escolher meu plano"}
          body="Etapas: plano → pagamento → personalizar → conversar."
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
        <div>
          <h1 className="font-display text-3xl text-ink">{greeting}</h1>
          <p className="mt-2 max-w-2xl text-ink-soft" aria-live="polite">
            Pagamento concluído — falta 1 etapa.
          </p>
        </div>
        <PlatformActionCard
          title="Personalize sua experiência"
          body="Conte-nos como você prefere receber suas reflexões."
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
        <div>
          <h1 className="font-display text-3xl text-ink">{greeting}</h1>
          <p className="mt-2 max-w-2xl text-ink-soft" role="status" aria-live="polite">
            Há um problema com o pagamento da sua assinatura. Atualize a forma
            de pagamento para continuar conversando.
          </p>
        </div>
        <PlatformActionCard
          title="Atualizar pagamento"
          body="Revise a assinatura e a forma de pagamento na sua conta."
          href="/conta"
          cta="Ir para minha conta"
          tone="emphasis"
        />
      </div>
    );
  }

  // active_ready | canceling_at_period_end
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">{greeting}</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Traga sua situação e receba uma reflexão baseada nas Escrituras.
          {state === "canceling_at_period_end"
            ? " Sua renovação está cancelada, mas o acesso continua até o fim do período."
            : ""}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PlatformActionCard
          title="Começar uma reflexão"
          body={
            recentConversation?.title
              ? `Recente: ${recentConversation.title}`
              : "Uma conversa guiada pelas Escrituras, no tom que você escolheu."
          }
          href={
            recentConversation
              ? `/conversar?c=${recentConversation.id}`
              : "/conversar"
          }
          cta="Conversar"
        />
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="font-display text-xl text-ink">Seu plano</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {plan?.name ?? "Assinatura ativa"}
            {auth.demoMode ? " · acesso limitado" : ""}
          </p>
          <Button asChild variant="outline" className="mt-5 min-h-11">
            <Link href="/conta">Gerenciar assinatura</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
