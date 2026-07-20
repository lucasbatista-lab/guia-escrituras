import Link from "next/link";
import { redirect } from "next/navigation";
import { DataExportPanel } from "@/components/account/data-export-panel";
import { SubscriptionManagementPanel } from "@/components/account/subscription-management-panel";
import { InlineNotice } from "@/components/platform/inline-notice";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { PlatformSection } from "@/components/platform/section";
import { PlanStatusBadge } from "@/components/platform/plan-status-badge";
import { ShareInvite } from "@/components/share/share-invite";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getAuthUserContext } from "@/lib/auth";
import { getRepositories } from "@/lib/database/repositories";
import { getPlanByKey, canUseDeepResponseOnDemand } from "@/lib/entitlements";
import {
  preferredDepthLabelPt,
  responseStyleLabelPt,
  traditionLabelPt,
} from "@/lib/profile/labels-pt";
import { resolveUserShareUrl } from "@/lib/share/resolve-server";
import { getAccountBillingView } from "@/lib/stripe/subscription-management";
import {
  evaluateMonthlyBudget,
  getBudgetConfig,
  usageLevelLabel,
} from "@/lib/usage";
import { currentYearMonth } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

async function loadProfileMeta(userId: string): Promise<{
  displayName: string | null;
  createdAt: string | null;
}> {
  try {
    const supabase = await createClient();
    if (!supabase) return { displayName: null, createdAt: null };
    const { data } = await supabase
      .from("profiles")
      .select("display_name, created_at")
      .eq("id", userId)
      .maybeSingle();
    return {
      displayName: (data?.display_name as string | null) ?? null,
      createdAt: (data?.created_at as string | null) ?? null,
    };
  } catch {
    return { displayName: null, createdAt: null };
  }
}

export default async function ContaPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/conta");
  }

  const plan = auth.planKey ? getPlanByKey(auth.planKey) : null;
  const budgetConfig = auth.planKey ? getBudgetConfig(auth.planKey) : null;
  const supportEmail = brand.supportEmail;
  const profileMeta = await loadProfileMeta(auth.userId);

  const [billing, monthlyUsage, shareUrl] = await Promise.all([
    plan ? getAccountBillingView(auth.userId) : Promise.resolve(null),
    budgetConfig
      ? (async () => {
          try {
            const repos = getRepositories();
            return await repos.usage.getMonthly(
              auth.userId,
              currentYearMonth(),
            );
          } catch {
            return null;
          }
        })()
      : Promise.resolve(null),
    resolveUserShareUrl(auth.userId, "account_share"),
  ]);

  let level: "normal" | "elevated" | "near_limit" | "blocked" = "normal";
  if (budgetConfig && monthlyUsage) {
    level = evaluateMonthlyBudget({
      usedBrlCents: monthlyUsage.usedBrlCents,
      config: budgetConfig,
    }).level;
  }

  const personalizationDone = auth.spiritualProfile.onboardingCompleted;
  const hasDeepOnDemand = canUseDeepResponseOnDemand(auth.planKey);

  return (
    <div className="space-y-8">
      <PlatformPageHeader
        title="Conta"
        description="Perfil, preferências e assinatura em um só lugar."
      />

      <PlatformSection title="Perfil">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Nome</dt>
            <dd className="mt-0.5 text-base text-ink">
              {profileMeta.displayName?.trim() || "Não informado"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">E-mail</dt>
            <dd className="mt-0.5 text-base text-ink">
              {auth.email ?? "Sem e-mail vinculado"}
            </dd>
            <p className="mt-1 text-xs text-ink-soft">
              A alteração de e-mail pela conta ainda não está disponível.
            </p>
          </div>
          {profileMeta.createdAt ? (
            <div>
              <dt className="text-ink-soft">Cadastro</dt>
              <dd className="mt-0.5 text-base text-ink">
                {new Date(profileMeta.createdAt).toLocaleDateString("pt-BR")}
              </dd>
            </div>
          ) : null}
        </dl>
      </PlatformSection>

      <PlatformSection
        title="Preferências"
        description="Como preferimos falar com você nas reflexões."
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Tradição</dt>
            <dd className="mt-0.5 text-base text-ink">
              {traditionLabelPt(auth.spiritualProfile.traditionKey)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Estilo</dt>
            <dd className="mt-0.5 text-base text-ink">
              {responseStyleLabelPt(auth.spiritualProfile.responseStyle)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Profundidade</dt>
            <dd className="mt-0.5 text-base text-ink">
              {preferredDepthLabelPt(auth.spiritualProfile.preferredDepth)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Status</dt>
            <dd className="mt-0.5">
              <PlanStatusBadge
                label={personalizationDone ? "Preferências salvas" : "Pendente"}
                tone={personalizationDone ? "active" : "attention"}
              />
            </dd>
          </div>
        </dl>
        <Button asChild variant="outline" className="mt-5 min-h-11">
          <Link href="/personalizar">Alterar preferências</Link>
        </Button>
      </PlatformSection>

      <PlatformSection title="Assinatura">
        {plan && billing ? (
          <>
            <div className="mb-4">
              <PlanStatusBadge
                label={billing.statusLabel}
                tone={
                  billing.cancelAtPeriodEnd ||
                  billing.statusLabel.toLowerCase().includes("atras")
                    ? "attention"
                    : "active"
                }
              />
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-soft">Plano</dt>
                <dd className="mt-0.5 text-base text-ink">{billing.planName}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Valor mensal</dt>
                <dd className="mt-0.5 text-base text-ink">
                  {billing.priceMonthlyLabel}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">
                  {billing.cancelAtPeriodEnd
                    ? "Acesso até"
                    : "Próxima cobrança"}
                </dt>
                <dd className="mt-0.5 text-base text-ink">
                  {billing.cancelAtPeriodEnd
                    ? (billing.accessUntilLabel ?? "Não informada")
                    : (billing.nextChargeLabel ?? "Não informada")}
                </dd>
              </div>
              {billing.cardLabel ? (
                <div>
                  <dt className="text-ink-soft">Cartão</dt>
                  <dd className="mt-0.5 text-base text-ink">
                    {billing.cardLabel}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
              {billing.renewsAutomatically
                ? "A renovação é automática ao final de cada período."
                : billing.cancelAtPeriodEnd
                  ? "A renovação automática está desativada. Você mantém o acesso até a data indicada."
                  : "Renovação automática indisponível para este tipo de assinatura."}
            </p>
            {hasDeepOnDemand ? (
              <p className="mt-3 text-sm text-ink-soft">
                Resposta aprofundada sob demanda disponível no chat.
              </p>
            ) : null}
            {level !== "normal" ? (
              <div className="mt-4">
                <InlineNotice tone="info">
                  Uso neste mês: {usageLevelLabel(level)}. Sem cotas rígidas de
                  mensagens — o plano tem um orçamento flexível.
                </InlineNotice>
              </div>
            ) : null}
            <div className="mt-6">
              <SubscriptionManagementPanel
                planName={billing.planName}
                accessUntilLabel={billing.accessUntilLabel}
                cancelAtPeriodEnd={billing.cancelAtPeriodEnd}
                canCancelRenewal={billing.canCancelRenewal}
                canReactivate={billing.canReactivate}
                isManualOnly={billing.isManualOnly}
                hasStripeManagedSubscription={
                  billing.hasStripeManagedSubscription
                }
              />
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              <Link
                href="/planos#comparar-uso"
                className="text-ink underline underline-offset-4"
              >
                Ver diferenças entre planos
              </Link>
              . A troca automática entre planos ainda não está disponível.
            </p>
          </>
        ) : (
          <div role="status" aria-live="polite">
            <p className="text-sm text-ink-soft">
              Não há plano gratuito.{" "}
              <Link
                href="/planos"
                className="text-ink underline underline-offset-4"
              >
                Conhecer planos
              </Link>
            </p>
          </div>
        )}
      </PlatformSection>

      <PlatformSection
        title="Compartilhe com alguém"
        description="Conhece alguém que poderia se beneficiar de uma reflexão baseada nas Escrituras? Envie o Amém Chat com uma mensagem pronta."
      >
        <ShareInvite shareUrl={shareUrl} />
      </PlatformSection>

      <PlatformSection
        title="Seus dados"
        description="Baixe uma cópia das informações associadas à sua conta, incluindo perfil, preferências, consentimentos e conversas."
      >
        <DataExportPanel />
      </PlatformSection>

      <PlatformSection
        title="Segurança"
        description="Proteja o acesso à sua conta."
      >
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/recuperar-senha">Redefinir senha</Link>
        </Button>
      </PlatformSection>

      {supportEmail ? (
        <PlatformSection
          title="Suporte"
          description="Precisa de ajuda com a conta ou a assinatura?"
        >
          <a
            href={`mailto:${supportEmail}`}
            className="text-base text-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {supportEmail}
          </a>
        </PlatformSection>
      ) : null}
    </div>
  );
}
