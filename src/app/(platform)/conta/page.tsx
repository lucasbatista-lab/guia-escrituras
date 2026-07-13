import Link from "next/link";
import { redirect } from "next/navigation";
import { SubscriptionManagementPanel } from "@/components/account/subscription-management-panel";
import { getAuthUserContext } from "@/lib/auth";
import { getRepositories } from "@/lib/database/repositories";
import { getPlanByKey } from "@/lib/entitlements";
import { getAccountBillingView } from "@/lib/stripe/subscription-management";
import {
  evaluateMonthlyBudget,
  getBudgetConfig,
  usageLevelLabel,
} from "@/lib/usage";
import { currentYearMonth } from "@/lib/utils";

export default async function ContaPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/conta");
  }

  const plan = auth.planKey ? getPlanByKey(auth.planKey) : null;
  const budgetConfig = auth.planKey ? getBudgetConfig(auth.planKey) : null;
  const billing = plan ? await getAccountBillingView(auth.userId) : null;

  let level: "normal" | "elevated" | "near_limit" | "blocked" = "normal";
  if (budgetConfig) {
    try {
      const repos = getRepositories();
      const monthly = await repos.usage.getMonthly(
        auth.userId,
        currentYearMonth(),
      );
      level = evaluateMonthlyBudget({
        usedBrlCents: monthly.usedBrlCents,
        config: budgetConfig,
      }).level;
    } catch {
      level = "normal";
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Conta</h1>
        <p className="mt-2 text-ink-soft">
          {auth.email ?? "Conta em demonstração"}
        </p>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Assinatura</h2>
        {plan && billing ? (
          <>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-soft">Plano atual</dt>
                <dd className="text-ink">{billing.planName}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Valor mensal</dt>
                <dd className="text-ink">{billing.priceMonthlyLabel}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Status</dt>
                <dd className="text-ink">{billing.statusLabel}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">
                  {billing.cancelAtPeriodEnd ? "Acesso até" : "Próxima cobrança"}
                </dt>
                <dd className="text-ink">
                  {billing.cancelAtPeriodEnd
                    ? (billing.accessUntilLabel ?? "Não informada")
                    : (billing.nextChargeLabel ?? "Não informada")}
                </dd>
              </div>
              {billing.cardLabel ? (
                <div>
                  <dt className="text-ink-soft">Forma de pagamento</dt>
                  <dd className="text-ink">{billing.cardLabel}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-4 text-sm text-ink-soft">
              {billing.renewsAutomatically
                ? "A renovação é automática ao final de cada período."
                : billing.cancelAtPeriodEnd
                  ? "A renovação automática está desativada para esta assinatura."
                  : "Renovação automática indisponível para este tipo de assinatura."}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              {plan.displayBenefits.map((benefit) => (
                <li key={benefit}>· {benefit}</li>
              ))}
            </ul>
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
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            Não há plano gratuito.{" "}
            <Link href="/planos" className="underline underline-offset-4">
              Conhecer planos
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Uso</h2>
        <p className="mt-2 text-lg text-ink">{usageLevelLabel(level)}</p>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Linguagem amigável (uso normal, elevado ou próximo do limite), sem
          cotas rígidas de mensagens.
          {budgetConfig
            ? ` Limite diário de segurança: ${budgetConfig.dailyBurstLimit} requisições.`
            : ""}
        </p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Perfil espiritual</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Tradição</dt>
            <dd className="text-ink">{auth.spiritualProfile.traditionKey}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Estilo</dt>
            <dd className="text-ink">{auth.spiritualProfile.responseStyle}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Profundidade</dt>
            <dd className="text-ink">{auth.spiritualProfile.preferredDepth}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Onboarding</dt>
            <dd className="text-ink">
              {auth.spiritualProfile.onboardingCompleted
                ? "Concluído"
                : "Pendente"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
