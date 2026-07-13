import {
  PLAN_DEFINITIONS,
  formatPriceBRL,
  type PlanDefinition,
} from "@/lib/entitlements";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanCards({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
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
        <PlanCard key={plan.key} plan={plan} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanDefinition }) {
  const href =
    plan.ctaType === "request_access"
      ? "/mensagens-personalizadas"
      : `/cadastro?plan=${plan.key}`;

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card/70 p-6 shadow-sm backdrop-blur-sm",
        plan.highlighted && "border-gold/40 ring-1 ring-gold/30",
      )}
    >
      {plan.highlighted ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-gold">
          Mais escolhido
        </p>
      ) : (
        <div className="mb-3 h-4" />
      )}
      <h3 className="font-display text-2xl text-ink">{plan.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{plan.tagline}</p>
      <p className="mt-5 font-display text-3xl text-ink">
        {formatPriceBRL(plan.priceMonthlyCents)}
        <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
          /mês
        </span>
      </p>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-soft">
        {plan.displayBenefits.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine/70" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      {plan.upcomingBenefits && plan.upcomingBenefits.length > 0 ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
            Em desenvolvimento
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-ink-soft/90">
            {plan.upcomingBenefits.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button
        asChild
        className={cn(
          "mt-6 w-full",
          plan.ctaType === "request_access"
            ? "bg-wine hover:bg-wine-soft"
            : plan.highlighted
              ? "bg-ink hover:bg-ink/90"
              : "",
        )}
        variant={
          plan.highlighted || plan.ctaType === "request_access"
            ? "default"
            : "outline"
        }
      >
        <TrackingLink href={href}>{plan.ctaLabel}</TrackingLink>
      </Button>
    </article>
  );
}
