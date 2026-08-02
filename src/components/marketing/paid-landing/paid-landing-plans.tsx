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
import { useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";

const SHORT_IDEAL: Record<string, string> = {
  essencial: "Clareza pontual",
  caminho: "Constância com Jornadas",
  profundo: "Mais análise com Aprofundar",
};

function CaminhoOffer({
  plan,
  href,
}: {
  plan: PlanDefinition;
  href: string;
}) {
  const benefits = plan.displayBenefits.slice(0, Math.min(3, MAX_PUBLIC_PLAN_BENEFITS));

  return (
    <article className="relative overflow-hidden rounded-[1.6rem] border border-wine/40 bg-ink px-4 py-4 text-sand-50 shadow-[0_24px_50px_-34px_rgba(44,36,28,0.7)] sm:px-6 sm:py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(198,160,90,0.22),transparent_45%),radial-gradient(ellipse_at_100%_100%,rgba(107,46,58,0.45),transparent_50%)]"
      />
      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
          Plano recomendado
        </p>
        <h3 className="mt-1.5 font-display text-2xl text-sand-50 sm:text-3xl">
          Para quem quer voltar ao longo da semana.
        </h3>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-display text-xl text-sand-50">{plan.name}</p>
            <p className="mt-0.5 text-sm text-sand-50/70">
              {SHORT_IDEAL[plan.key] ?? plan.idealFor}
            </p>
          </div>
          <p className="font-display text-3xl text-sand-50 sm:text-4xl">
            {formatPriceBRL(plan.priceMonthlyCents)}
            <span className="ml-1 text-sm font-sans font-normal text-sand-50/65">
              /mês
            </span>
          </p>
        </div>
        <p className="mt-2.5 max-w-2xl text-sm leading-snug text-sand-50/78">
          Conversas contextualizadas, Histórico privado e Jornadas.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-sand-50/80">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-gold"
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            asChild
            className="min-h-11 w-full bg-sand-50 text-ink hover:bg-sand-100 sm:w-auto sm:min-w-[12rem]"
          >
            <TrackingLink
              href={href}
              conversionEvent="paid_landing_plan_selected"
              conversionPlan={plan.key}
            >
              Escolher Caminho
            </TrackingLink>
          </Button>
          <p className="text-xs leading-snug text-sand-50/65 sm:max-w-xs">
            Cobrança mensal com Stripe · cancele a renovação pela Conta.
          </p>
        </div>
        <p className="mt-2.5 text-[11px] leading-snug text-sand-50/60 sm:text-xs">
          Conversas privadas · dados não vendidos · IA com limites
        </p>
      </div>
    </article>
  );
}

function AltPlanCard({
  plan,
  href,
}: {
  plan: PlanDefinition;
  href: string;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const visibleCount = open ? Math.min(3, MAX_PUBLIC_PLAN_BENEFITS) : 2;
  const benefits = plan.displayBenefits.slice(0, visibleCount);
  const shortIdeal = SHORT_IDEAL[plan.key] ?? plan.idealFor;

  return (
    <article className="flex flex-col rounded-2xl border border-border/80 bg-card/70 p-3.5 sm:p-5">
      <h3 className="font-display text-xl text-ink sm:text-2xl">{plan.name}</h3>
      <p className="mt-0.5 text-sm font-medium text-ink">{shortIdeal}</p>
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
      <button
        type="button"
        className="mt-2 min-h-11 self-start text-sm font-medium text-ink underline-offset-4 hover:underline"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Ocultar detalhes" : "Ver mais detalhes"}
      </button>
      <Button asChild variant="outline" className="mt-3 min-h-11 w-full">
        <TrackingLink
          href={href}
          conversionEvent="paid_landing_plan_selected"
          conversionPlan={plan.key}
        >
          {plan.key === "essencial"
            ? "Escolher Essencial"
            : plan.key === "profundo"
              ? "Escolher Profundo"
              : plan.ctaLabel}
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
          <AltPlanCard
            key={plan.key}
            plan={plan}
            href={buildCadastroHref(plan.key, tracking)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CaminhoOffer
        plan={caminho}
        href={buildCadastroHref(caminho.key, tracking)}
      />

      <div>
        <p className="text-sm font-medium text-ink">
          Outras formas de usar o Amém Chat
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <AltPlanCard
            plan={essencial}
            href={buildCadastroHref(essencial.key, tracking)}
          />
          <AltPlanCard
            plan={profundo}
            href={buildCadastroHref(profundo.key, tracking)}
          />
        </div>
      </div>
    </div>
  );
}

export function PaidLandingPlans() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-hidden>
          <div className="h-72 rounded-[1.6rem] border border-border/60 bg-ink/90" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-52 rounded-2xl border border-border/60 bg-card/40" />
            <div className="h-52 rounded-2xl border border-border/60 bg-card/40" />
          </div>
        </div>
      }
    >
      <PaidLandingPlansInner />
    </Suspense>
  );
}
