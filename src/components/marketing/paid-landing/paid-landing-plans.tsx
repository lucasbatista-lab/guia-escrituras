"use client";

import { Check } from "lucide-react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import {
  formatPriceBRL,
  getPublicCheckoutPlans,
  MAX_PUBLIC_PLAN_BENEFITS,
} from "@/lib/entitlements";
import { buildCadastroHref } from "@/lib/signup-intents/params";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => {
        const href = buildCadastroHref(plan.key, tracking);
        const benefits = plan.displayBenefits.slice(
          0,
          Math.min(4, MAX_PUBLIC_PLAN_BENEFITS),
        );
        const badge = plan.highlightBadge ?? null;

        return (
          <article
            key={plan.key}
            className={cn(
              "flex flex-col rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5",
              plan.highlighted &&
                "border-gold/50 bg-gradient-to-b from-card to-sand-100/70 ring-1 ring-gold/25",
            )}
          >
            {badge ? (
              <p className="mb-2 text-[11px] font-medium leading-snug tracking-[0.08em] text-gold">
                {badge}
              </p>
            ) : (
              <div className="mb-2 h-4" aria-hidden />
            )}
            <h3 className="font-display text-2xl text-ink">{plan.name}</h3>
            <p className="mt-1 text-sm font-medium text-ink">{plan.idealFor}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {plan.tagline}
            </p>
            <p className="mt-4 font-display text-3xl text-ink">
              {formatPriceBRL(plan.priceMonthlyCents)}
              <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
                /mês
              </span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 border-t border-border/70 pt-4 text-sm text-ink-soft">
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
            <Button
              asChild
              className={cn(
                "mt-5 min-h-11 w-full",
                plan.highlighted ? "bg-ink hover:bg-ink/90" : "",
              )}
              variant={plan.highlighted ? "default" : "outline"}
            >
              <TrackingLink
                href={href}
                conversionEvent="paid_landing_plan_selected"
                conversionPlan={plan.key}
              >
                {plan.ctaLabel}
              </TrackingLink>
            </Button>
          </article>
        );
      })}
    </div>
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
              className="h-72 rounded-2xl border border-border/60 bg-card/40"
            />
          ))}
        </div>
      }
    >
      <PaidLandingPlansInner />
    </Suspense>
  );
}
