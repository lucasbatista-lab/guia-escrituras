import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, LockKeyhole } from "lucide-react";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { PublicConversionBeacon } from "@/components/marketing/public-conversion-beacon";
import { PurchaseJourneySteps } from "@/components/marketing/purchase-journey-steps";
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
import { authEntryMetadata } from "@/lib/seo/auth-metadata";

export const metadata = authEntryMetadata.cadastro;

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
  const loginHref = validated?.ok
    ? `/entrar?next=${encodeURIComponent(`/cadastro?plan=${validated.planKey}`)}`
    : "/entrar";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_5%,rgba(198,160,90,0.18),transparent_30%),radial-gradient(circle_at_95%_85%,rgba(107,46,58,0.09),transparent_32%)]">
      <header className="safe-header-pad mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-6 sm:px-6 sm:pt-8">
        <Link href="/" className="font-display text-xl text-ink">
          {brand.name}
        </Link>
        <TrackingLink
          href={loginHref}
          className="inline-flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Já tenho conta
        </TrackingLink>
      </header>

      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 outline-none sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10 lg:py-12"
      >
        <PublicConversionBeacon
          event="signup_started"
          plan={validated?.ok ? validated.planKey : null}
        />
        <section className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-42px_rgba(44,36,28,0.65)] backdrop-blur-sm sm:p-8">
          <PurchaseJourneySteps current="conta" className="mb-6" />
          {plan ? (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-sand-100/60 px-4 py-3 lg:hidden">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                  Plano escolhido
                </p>
                <p className="mt-0.5 font-display text-lg text-ink">{plan.name}</p>
              </div>
              <p className="text-sm font-medium text-ink">
                {formatPriceBRL(plan.priceMonthlyCents)}/mês
              </p>
            </div>
          ) : null}
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
            Etapa 1 de 3 · sua conta
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
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
              loginHref={loginHref}
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
    <div className="rounded-3xl border border-border/70 bg-ink p-6 text-sand-50 shadow-[0_24px_70px_-42px_rgba(44,36,28,0.7)]">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-soft">
        Seu plano
      </p>
      <h2 className="mt-2 font-display text-2xl text-sand-50">{plan.name}</h2>
      <p className="mt-1 text-sm text-sand-200">{plan.idealFor}</p>
      <p className="mt-4 font-display text-3xl text-sand-50">
        {formatPriceBRL(plan.priceMonthlyCents)}
        <span className="ml-1 text-sm font-sans font-normal text-sand-200">
          /mês
        </span>
      </p>
      <ul className="mt-5 space-y-2.5 text-sm text-sand-200">
        {plan.displayBenefits.slice(0, 3).map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-soft" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2 border-t border-sand-50/15 pt-4 text-xs leading-relaxed text-sand-200">
        <p>Renovação automática mensal.</p>
        <p>Cancelamento da renovação pela sua conta no Amém Chat.</p>
        <p>Pagamento seguro processado pela Stripe.</p>
        <p className="flex items-center gap-1.5 font-medium text-sand-50">
          <LockKeyhole aria-hidden className="size-3.5" />
          Você só pagará depois de confirmar seu e-mail.
        </p>
      </div>
      <TrackingLink
        href="/planos"
        className="mt-4 inline-flex min-h-11 items-center text-xs text-sand-50 underline underline-offset-4"
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
