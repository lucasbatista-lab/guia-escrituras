"use client";

import { Check } from "lucide-react";
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
  "Organize a situação quando ela aparecer.",
  "Retome sem recomeçar do zero.",
  "Siga uma Jornada quando quiser aprofundar.",
  "Mantenha suas conversas privadas no Histórico.",
] as const;

const ESSENCIAL_OUTCOMES = [
  "Organize a situação quando ela aparecer.",
  "Mantenha suas conversas privadas no Histórico.",
] as const;

const PROFUNDO_OUTCOMES = [
  "Siga uma Jornada quando quiser aprofundar.",
  "Use Aprofundar para mais contexto e tensões.",
  "Mantenha suas conversas privadas no Histórico.",
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
      className="relative overflow-hidden px-4 py-8 text-sand-50 sm:px-6 sm:py-12 lg:py-14"
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
          <h2 className="mt-2.5 font-sans text-[1.65rem] font-semibold leading-snug tracking-tight text-sand-50 sm:text-[2rem] lg:text-[2.35rem]">
            Para situações que não terminam na primeira conversa.
          </h2>
        </div>

        <div className="mt-5 grid items-end gap-5 lg:mt-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:gap-12">
          <div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="font-sans text-xl font-semibold text-sand-50 sm:text-2xl">
                {plan.name}
              </p>
              <p className="font-sans text-[2.35rem] font-semibold leading-none tracking-tight text-sand-50 sm:text-[3rem]">
                {formatPriceBRL(plan.priceMonthlyCents)}
                <span className="ml-1.5 text-base font-normal text-sand-50/65">
                  /mês
                </span>
              </p>
            </div>
            <p className="mt-3 max-w-xl text-[0.98rem] leading-snug text-sand-50/80">
              Converse com mais espaço, retome pelo Histórico e siga Jornadas
              guiadas quando quiser continuar refletindo.
            </p>
            <ul className="mt-4 space-y-2">
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

          <div className="lg:pb-1">
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
            <p className="mt-3 max-w-xs text-xs leading-snug text-sand-50/65">
              Cobrança mensal segura com Stripe. Cancele a renovação pela sua
              Conta.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {[
                "Conversas privadas.",
                "Dados não vendidos.",
                "IA com limites claros.",
              ].map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-sand-50/15 bg-sand-50/[0.06] px-3 py-1 text-[11px] text-sand-50/70"
                >
                  {chip}
                </li>
              ))}
            </ul>
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
  outcomes,
}: {
  plan: PlanDefinition;
  href: string;
  pitch: string;
  outcomes: readonly string[];
}) {
  return (
    <article className="flex flex-col border-t border-border/70 pt-5 sm:border-t-0 sm:border-l sm:border-border/70 sm:pl-6 sm:pt-0 first:border-t-0 first:pt-0 first:sm:border-l-0 first:sm:pl-0">
      <h3 className="font-sans text-xl font-semibold text-ink">{plan.name}</h3>
      <p className="mt-1 text-sm text-ink-soft">{pitch}</p>
      <p className="mt-3 font-sans text-2xl font-semibold text-ink">
        {formatPriceBRL(plan.priceMonthlyCents)}
        <span className="ml-1 text-sm font-normal text-ink-soft">/mês</span>
      </p>
      <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink-soft">
        {outcomes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-wine" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" className="mt-4 min-h-11 w-full sm:w-auto">
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
        className="border-t border-border/50 bg-sand-50"
        aria-labelledby="outras-formas-v2-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
          <h2
            id="outras-formas-v2-heading"
            className="font-sans text-lg font-semibold text-ink sm:text-xl"
          >
            Outras formas de usar o Amém Chat
          </h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-0">
            <AltPlan
              plan={essencial}
              href={buildCadastroHref(essencial.key, tracking)}
              pitch="Para reflexões pontuais."
              outcomes={ESSENCIAL_OUTCOMES}
            />
            <AltPlan
              plan={profundo}
              href={buildCadastroHref(profundo.key, tracking)}
              pitch="Para temas que pedem mais análise."
              outcomes={PROFUNDO_OUTCOMES}
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
