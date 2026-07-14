import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { brand } from "@/config/brand";
import { redirectAuthenticatedPlanSelection } from "@/lib/auth/plan-continuation-action";
import {
  formatPriceBRL,
  getPlanByKey,
  type PlanDefinition,
} from "@/lib/entitlements";
import { withTrackingParams } from "@/lib/navigation/tracking-href";
import {
  parseSignupSearchParams,
  validateCheckoutPlan,
} from "@/lib/signup-intents";

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(198,160,90,0.10),_transparent_50%)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-8 sm:px-6">
        <Link href="/" className="font-display text-xl text-ink">
          {brand.name}
        </Link>
        <TrackingLink
          href="/entrar"
          className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Entrar
        </TrackingLink>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-12 lg:py-14">
        <section className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            Criar conta
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
            {plan
              ? `Você escolheu o plano ${plan.name}. Crie a conta, confirme o e-mail e continue para o pagamento seguro.`
              : "Crie sua conta para começar. Depois você escolhe o plano e confirma o pagamento com segurança."}
          </p>
          <div className="mt-8">
            <SignUpForm
              planKey={validated?.ok ? validated.planKey : null}
              tracking={tracking}
            />
          </div>
        </section>

        <aside className="lg:sticky lg:top-8">
          {plan ? <PlanSupportCard plan={plan} /> : <NoPlanSupportCard />}
        </aside>
      </main>
    </div>
  );
}

function PlanSupportCard({ plan }: { plan: PlanDefinition }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
        Seu plano
      </p>
      <h2 className="mt-2 font-display text-2xl text-ink">{plan.name}</h2>
      <p className="mt-1 text-sm text-ink-soft">{plan.tagline}</p>
      <p className="mt-4 font-display text-3xl text-ink">
        {formatPriceBRL(plan.priceMonthlyCents)}
        <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
          /mês
        </span>
      </p>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        {plan.displayBenefits.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine/70" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2 border-t border-border/60 pt-4 text-xs leading-relaxed text-ink-soft">
        <p>Renovação automática mensal.</p>
        <p>Cancelamento da renovação pela sua conta no Amém Chat.</p>
        <p>Pagamento seguro processado pela Stripe.</p>
        <p className="font-medium text-ink">
          Você só pagará depois de confirmar seu e-mail.
        </p>
      </div>
      <TrackingLink
        href="/planos"
        className="mt-4 inline-block text-xs text-ink underline underline-offset-4"
      >
        Trocar plano
      </TrackingLink>
    </div>
  );
}

function NoPlanSupportCard() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
        Próximo passo
      </p>
      <h2 className="mt-2 font-display text-2xl text-ink">
        Plano depois do cadastro
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Nenhum plano foi selecionado ainda. Depois de criar a conta e confirmar
        o e-mail, você escolhe o plano e conclui o pagamento.
      </p>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        <li>· Checkout seguro pela Stripe</li>
        <li>· Renovação cancelável na conta</li>
        <li>· Sem cobrança antes da confirmação do e-mail</li>
      </ul>
      <TrackingLink
        href="/planos"
        className="mt-6 inline-flex rounded-md bg-ink px-4 py-2 text-sm text-sand-50"
      >
        Ver planos
      </TrackingLink>
    </div>
  );
}
