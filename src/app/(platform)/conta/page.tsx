import Link from "next/link";
import { redirect } from "next/navigation";
import { ManageSubscriptionButton } from "@/components/account/manage-subscription-button";
import { getAuthUserContext } from "@/lib/auth";
import {
  subscriptionStatusLabel,
  type SubscriptionStatus,
  userHasBillingCustomer,
} from "@/lib/billing";
import { getRepositories } from "@/lib/database/repositories";
import { getPlanByKey } from "@/lib/entitlements";
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
  const hasPortal = await userHasBillingCustomer(auth.userId);

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

  const statusLabel =
    auth.subscriptionStatus &&
    ["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"].includes(
      auth.subscriptionStatus,
    )
      ? subscriptionStatusLabel(auth.subscriptionStatus as SubscriptionStatus)
      : auth.subscriptionStatus;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Conta</h1>
        <p className="mt-2 text-ink-soft">
          {auth.email ?? "Conta em demonstração"}
        </p>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Plano</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {plan?.name ?? "Sem assinatura ativa"}
        </p>
        {plan ? (
          <>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-soft">Status</dt>
                <dd className="text-ink">{statusLabel ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Validade</dt>
                <dd className="text-ink">
                  {auth.subscriptionPeriodEnd
                    ? new Date(auth.subscriptionPeriodEnd).toLocaleDateString("pt-BR")
                    : "Não informada"}
                </dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              {plan.displayBenefits.map((benefit) => (
                <li key={benefit}>· {benefit}</li>
              ))}
            </ul>
            <div className="mt-6">
              {hasPortal ? (
                <ManageSubscriptionButton />
              ) : auth.hasStripeSubscription ? (
                <p className="text-sm text-ink-soft">
                  Portal de cobrança ainda não disponível para esta conta.
                </p>
              ) : (
                <p className="text-sm text-ink-soft">
                  Esta assinatura não está vinculada ao portal de pagamento. Em caso
                  de dúvida, fale com o suporte.
                </p>
              )}
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
