"use client";

import { Check } from "lucide-react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import {
  formatPriceBRL,
  getPublicCheckoutPlans,
  MAX_PUBLIC_PLAN_BENEFITS,
  type PlanDefinition,
} from "@/lib/entitlements";
import { buildCadastroHref } from "@/lib/signup-intents/params";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";

const SHORT_IDEAL: Record<string, string> = {
  essencial: "Clareza pontual",
  caminho: "Constância com Jornadas",
  profundo: "Mais análise com Aprofundar",
};

function PlanCard({
  plan,
  href,
  compact = false,
  recommendedBadge = false,
}: {
  plan: PlanDefinition;
  href: string;
  compact?: boolean;
  recommendedBadge?: boolean;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const visibleCount = plan.highlighted
    ? Math.min(3, MAX_PUBLIC_PLAN_BENEFITS)
    : compact && !open
      ? 2
      : Math.min(3, MAX_PUBLIC_PLAN_BENEFITS);
  const benefits = plan.displayBenefits.slice(0, visibleCount);
  const badge = recommendedBadge
    ? "Recomendado"
    : plan.highlighted
      ? (plan.highlightBadge ?? "Recomendado")
      : null;
  const shortIdeal = SHORT_IDEAL[plan.key] ?? plan.idealFor;
  const showToggle = compact || (!plan.highlighted && plan.displayBenefits.length > 2);

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card/70 p-3.5 sm:p-5",
        plan.highlighted &&
          "border-gold/50 bg-gradient-to-b from-card to-sand-100/70 ring-1 ring-gold/25",
        compact && !plan.highlighted && "p-3",
      )}
    >
      {badge ? (
        <p className="mb-1.5 text-[11px] font-medium leading-snug tracking-[0.08em] text-gold">
          {badge}
        </p>
      ) : (
        <div className="mb-1.5 h-4" aria-hidden />
      )}
      <h3 className="font-display text-xl text-ink sm:text-2xl">{plan.name}</h3>
      <p className="mt-0.5 text-sm font-medium text-ink">{shortIdeal}</p>
      <p
        className={cn(
          "mt-1.5 text-sm leading-snug text-ink-soft line-clamp-2",
          !open && "max-md:hidden",
        )}
      >
        {plan.tagline}
      </p>
      <p className="mt-3 font-display text-2xl text-ink sm:text-3xl">
        {formatPriceBRL(plan.priceMonthlyCents)}
        <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
          /mês
        </span>
      </p>

      <ul
        id={detailsId}
        className="mt-3 flex-1 space-y-1.5 border-t border-border/70 pt-3 text-sm text-ink-soft"
      >
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-wine"
            />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      {showToggle ? (
        <button
          type="button"
          className="mt-2 min-h-11 self-start text-sm font-medium text-ink underline-offset-4 hover:underline"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ocultar detalhes" : "Ver mais detalhes"}
        </button>
      ) : null}

      <Button
        asChild
        className={cn(
          "mt-3 min-h-11 w-full",
          plan.highlighted ? "bg-ink hover:bg-ink/90" : "",
        )}
        variant={plan.highlighted ? "default" : "outline"}
      >
        <TrackingLink
          href={href}
          conversionEvent="paid_landing_plan_selected"
          conversionPlan={plan.key}
        >
          {plan.key === "caminho" ? "Escolher Caminho" : plan.ctaLabel}
        </TrackingLink>
      </Button>
    </article>
  );
}

function PaidLandingPlansInner() {
  const searchParams = useSearchParams();
  const tracking = {
    referralCode: searchParams.get("ref"),
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),
    utmContent: searchParams.get("utm_content"),
    utmTerm: searchParams.get("utm_term"),
  };
  const plans = getPublicCheckoutPlans();
  const byKey = Object.fromEntries(plans.map((plan) => [plan.key, plan])) as Record<
    string,
    PlanDefinition
  >;
  const caminho = byKey.caminho;
  const essencial = byKey.essencial;
  const profundo = byKey.profundo;

  if (!caminho || !essencial || !profundo) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            href={buildCadastroHref(plan.key, tracking)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Caminho first, then compact alternatives */}
      <div className="grid gap-3 md:hidden">
        <PlanCard
          plan={caminho}
          href={buildCadastroHref(caminho.key, tracking)}
          recommendedBadge
        />
        <PlanCard
          plan={essencial}
          href={buildCadastroHref(essencial.key, tracking)}
          compact
        />
        <PlanCard
          plan={profundo}
          href={buildCadastroHref(profundo.key, tracking)}
          compact
        />
      </div>

      {/* Desktop: Essencial · Caminho · Profundo */}
      <div className="hidden gap-4 md:grid md:grid-cols-3 md:items-stretch">
        <PlanCard
          plan={essencial}
          href={buildCadastroHref(essencial.key, tracking)}
        />
        <PlanCard
          plan={caminho}
          href={buildCadastroHref(caminho.key, tracking)}
          recommendedBadge
        />
        <PlanCard
          plan={profundo}
          href={buildCadastroHref(profundo.key, tracking)}
        />
      </div>
    </>
  );
}

export function PaidLandingPlans() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-border/60 bg-card/40"
            />
          ))}
        </div>
      }
    >
      <PaidLandingPlansInner />
    </Suspense>
  );
}
