import {
  PLAN_DEFINITIONS,
  formatPriceBRL,
  MAX_PUBLIC_PLAN_BENEFITS,
  type PlanDefinition,
  type PlanKey,
} from "@/lib/entitlements";
import { PlanConversionLink } from "@/components/marketing/plan-conversion-link";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanCards({
  className,
  compact = false,
  currentPlanKey = null,
  hasActiveSubscription = false,
}: {
  className?: string;
  compact?: boolean;
  currentPlanKey?: PlanKey | null;
  hasActiveSubscription?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-5",
        compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {PLAN_DEFINITIONS.map((plan) => (
        <PlanCard
          key={plan.key}
          plan={plan}
          isCurrentPlan={hasActiveSubscription && currentPlanKey === plan.key}
          hasActiveSubscription={hasActiveSubscription}
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrentPlan,
  hasActiveSubscription,
}: {
  plan: PlanDefinition;
  isCurrentPlan: boolean;
  hasActiveSubscription: boolean;
}) {
  const checkoutHref = `/cadastro?plan=${plan.key}`;
  const requestHref = "/mensagens-personalizadas";
  const benefits = plan.displayBenefits.slice(0, MAX_PUBLIC_PLAN_BENEFITS);

  const isCompareOnly =
    hasActiveSubscription && plan.ctaType === "checkout" && !isCurrentPlan;

  const buttonClass = cn(
    "mt-6 w-full min-h-11",
    plan.ctaType === "request_access"
      ? "bg-wine hover:bg-wine-soft"
      : plan.highlighted
        ? "bg-ink hover:bg-ink/90"
        : plan.key === "profundo"
          ? ""
          : "",
  );

  const buttonVariant =
    plan.highlighted || plan.ctaType === "request_access" || plan.key === "profundo"
      ? "default"
      : "outline";

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card/70 p-6 shadow-sm backdrop-blur-sm",
        plan.highlighted && "border-gold/40 ring-1 ring-gold/30",
        plan.key === "profundo" && !plan.highlighted && "border-wine/20",
        isCurrentPlan && "border-wine/40 ring-1 ring-wine/20",
      )}
    >
      {isCurrentPlan ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-wine">
          Seu plano atual
        </p>
      ) : plan.highlighted ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-gold">
          Recomendado
        </p>
      ) : plan.key === "profundo" ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-wine/90">
          Com Aprofundar
        </p>
      ) : (
        <div className="mb-3 h-4" aria-hidden />
      )}
      <h3 className="font-display text-2xl text-ink">{plan.name}</h3>
      <p className="mt-2 text-sm font-medium text-ink">{plan.idealFor}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{plan.tagline}</p>
      <p className="mt-5 font-display text-3xl text-ink">
        {formatPriceBRL(plan.priceMonthlyCents)}
        <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
          /mês
        </span>
      </p>
      <p className="mt-2 text-xs text-ink-soft">
        Cobrança mensal · cancele a renovação na sua conta
      </p>
      <div className="mt-5 flex-1">
        <ul className="space-y-2.5 text-sm text-ink-soft">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine/70"
                aria-hidden
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
      {isCurrentPlan ? (
        <Button
          className={cn(buttonClass, "pointer-events-none opacity-80")}
          variant="outline"
          disabled
          aria-disabled
        >
          Seu plano atual
        </Button>
      ) : isCompareOnly ? (
        <Button asChild className={buttonClass} variant="outline">
          <PlanConversionLink
            href="/planos#comparar-uso"
            event="upgrade_interest_clicked"
            targetPlanKey={plan.key}
            origin="plan_card"
          >
            Comparar planos
          </PlanConversionLink>
        </Button>
      ) : (
        <Button asChild className={buttonClass} variant={buttonVariant}>
          <TrackingLink
            href={plan.ctaType === "request_access" ? requestHref : checkoutHref}
          >
            {plan.ctaLabel}
          </TrackingLink>
        </Button>
      )}
    </article>
  );
}
