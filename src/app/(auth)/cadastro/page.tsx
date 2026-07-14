import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { redirectAuthenticatedPlanSelection } from "@/lib/auth/plan-continuation-action";
import { parseSignupSearchParams, validateCheckoutPlan } from "@/lib/signup-intents";
import { getPlanByKey, formatPriceBRL } from "@/lib/entitlements";
import { withTrackingParams } from "@/lib/navigation/tracking-href";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { planKey, tracking } = parseSignupSearchParams(params);

  if (planKey === "particular") {
    redirect(withTrackingParams("/mensagens-personalizadas", tracking));
  }

  const validated = planKey ? validateCheckoutPlan(planKey) : null;
  if (validated && !validated.ok && validated.code === "request_access_plan") {
    redirect(withTrackingParams("/mensagens-personalizadas", tracking));
  }

  if (planKey) {
    await redirectAuthenticatedPlanSelection(planKey, tracking);
  }

  const plan =
    validated?.ok === true ? getPlanByKey(validated.planKey) : undefined;

  return (
    <AuthShell
      title="Criar conta"
      subtitle={
        plan
          ? `Você escolheu o plano ${plan.name}. Crie sua conta para continuar.`
          : "Comece com um perfil espiritual que respeita sua tradição."
      }
    >
      {plan && (
        <div className="mb-4 rounded-lg border border-border/80 bg-sand-200/40 px-4 py-3 text-sm">
          <p className="font-medium text-ink">{plan.name}</p>
          <p className="text-ink-soft">
            {formatPriceBRL(plan.priceMonthlyCents)}/mês
          </p>
          <Link href="/planos" className="mt-1 inline-block text-xs text-ink underline-offset-4 hover:underline">
            Trocar plano
          </Link>
        </div>
      )}
      <SignUpForm
        planKey={validated?.ok ? validated.planKey : null}
        tracking={tracking}
      />
    </AuthShell>
  );
}
