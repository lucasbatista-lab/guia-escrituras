"use client";

import { Check, ChevronDown } from "lucide-react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import {
  formatPriceBRL,
  getPublicCheckoutPlans,
  type PlanDefinition,
} from "@/lib/entitlements";
import { buildCadastroHref } from "@/lib/signup-intents/params";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Outcome-oriented benefits derived from PLAN_DEFINITIONS entitlements —
 * language of use, not invented features.
 */
const CAMINHO_OUTCOMES = [
  "Retome sem começar do zero.",
  "Siga Jornadas quando quiser continuar.",
  "Tenha mais espaço para conversar ao longo do mês.",
] as const;

const ESSENCIAL_OUTCOMES = [
  "Conversa personalizada com referências bíblicas.",
  "Histórico privado para retomar.",
] as const;

const PROFUNDO_OUTCOMES = [
  "Tudo do Caminho, com Aprofundar sob demanda.",
  "Mais contexto, tensões e próximos passos quando você pedir.",
] as const;

function CaminhoOffer({
  plan,
  href,
}: {
  plan: PlanDefinition;
  href: string;
}) {
  return (
    <article
      id="oferta-caminho-v2"
      className="relative overflow-hidden px-4 py-7 text-sand-50 sm:px-6 sm:py-11 lg:py-12"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-ink"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(198,160,90,0.26),transparent_46%),radial-gradient(ellipse_at_100%_100%,rgba(107,46,58,0.5),transparent_52%)]"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
            Plano recomendado
          </p>
          <h2 className="mt-2 font-sans text-[1.55rem] font-semibold leading-snug tracking-tight text-sand-50 sm:text-[1.9rem] lg:text-[2.2rem]">
            Para situações que não terminam na primeira conversa.
          </h2>
        </div>

        <div className="mt-4 grid items-start gap-4 lg:mt-6 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)] lg:gap-10">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="font-sans text-lg font-semibold text-sand-50 sm:text-xl">
                {plan.name}
              </p>
              <p className="font-sans text-[2.15rem] font-semibold leading-none tracking-tight text-sand-50 sm:text-[2.75rem]">
                {formatPriceBRL(plan.priceMonthlyCents)}
                <span className="ml-1.5 text-base font-normal text-sand-50/65">
                  /mês
                </span>
              </p>
            </div>
            <p className="mt-2.5 max-w-xl text-[0.95rem] leading-snug text-sand-50/80">
              Mais espaço para conversar, Histórico para retomar e Jornadas para
              continuar.
            </p>
            <ul className="mt-3.5 space-y-1.5">
              {CAMINHO_OUTCOMES.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-[0.92rem] text-sand-50/85"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-gold"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pt-1">
            <Button
              asChild
              size="lg"
              className="min-h-12 w-full bg-sand-50 px-6 text-base text-ink hover:bg-sand-100 sm:w-auto sm:min-w-[14rem]"
            >
              <TrackingLink
                href={href}
                conversionEvent="paid_landing_plan_selected"
                conversionPlan={plan.key}
              >
                Escolher Caminho
              </TrackingLink>
            </Button>
            <p className="mt-2.5 max-w-xs text-xs leading-snug text-sand-50/65">
              Cobrança mensal com Stripe · cancele pela Conta
            </p>
            <p className="mt-3 text-[11px] leading-snug tracking-wide text-sand-50/70">
              Privado · dados não vendidos · IA com limites claros
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function AltPlan({
  plan,
  href,
  pitch,
  summary,
  outcomes,
  details,
}: {
  plan: PlanDefinition;
  href: string;
  pitch: string;
  summary: string;
  outcomes: readonly string[];
  details: readonly string[];
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-ink/10 bg-sand-50/90 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-lg font-semibold text-ink">{plan.name}</h3>
        <p className="font-sans text-xl font-semibold text-ink">
          {formatPriceBRL(plan.priceMonthlyCents)}
          <span className="ml-1 text-sm font-normal text-ink-soft">/mês</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{pitch}</p>
      <p className="mt-2 text-[0.8rem] font-medium uppercase tracking-[0.08em] text-wine">
        {summary}
      </p>
      <ul className="mt-2.5 flex-1 space-y-1.5 text-sm text-ink-soft">
        {outcomes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-wine" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <details className="group mt-2">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 text-xs text-ink-soft outline-none marker:content-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          Ver detalhes
          <ChevronDown
            aria-hidden
            className="size-3.5 transition group-open:rotate-180"
          />
        </summary>
        <ul className="mt-1 space-y-1 pb-1 text-xs leading-snug text-ink-soft">
          {details.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </details>
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

function PaidLandingV2OfferInner() {
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
    return null;
  }

  return (
    <div id="planos-v2" className="scroll-mt-6 sm:scroll-mt-8">
      <CaminhoOffer
        plan={caminho}
        href={buildCadastroHref(caminho.key, tracking)}
      />

      <section
        className="border-t border-border/50 bg-sand-100/50"
        aria-labelledby="outras-formas-v2-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <h2
            id="outras-formas-v2-heading"
            className="font-sans text-base font-semibold text-ink sm:text-lg"
          >
            Outras formas de usar o Amém Chat
          </h2>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <AltPlan
              plan={essencial}
              href={buildCadastroHref(essencial.key, tracking)}
              pitch="Para uma situação pontual."
              summary="Conversa + Histórico"
              outcomes={ESSENCIAL_OUTCOMES}
              details={[
                "Reflexão personalizada com orientação bíblica",
                "Tradição no perfil (ecumênica, evangélica ou católica)",
                "Cancelamento da renovação pela Conta",
              ]}
            />
            <AltPlan
              plan={profundo}
              href={buildCadastroHref(profundo.key, tracking)}
              pitch="Para temas que pedem outra camada de análise."
              summary="Caminho + Aprofundar"
              outcomes={PROFUNDO_OUTCOMES}
              details={[
                "Aprofundar sob demanda para análises adicionais",
                "Jornadas guiadas e mais espaço para conversar",
                "Cancelamento da renovação pela Conta",
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function PaidLandingV2Offer() {
  return (
    <Suspense
      fallback={
        <div id="planos-v2" className="bg-ink px-4 py-16" aria-hidden>
          <div className="mx-auto h-64 max-w-6xl rounded-2xl bg-sand-50/5" />
        </div>
      }
    >
      <PaidLandingV2OfferInner />
    </Suspense>
  );
}
