import { getPlanByKey, type PlanKey } from "@/lib/entitlements";
import type { UserJourneyState } from "@/lib/journey/journey-state";

/** Premium surfaces that FREE accounts may open via SoftPaywallSheet (no silent redirect). */
export type SoftPaywallResourceId = "conversar" | "jornadas";

/**
 * States where the user keeps a free (or lapsed) account and should see a
 * soft paywall sheet instead of being bounced to /inicio.
 */
export function journeyShowsSoftPaywall(state: UserJourneyState): boolean {
  return state === "confirmed_without_plan" || state === "ended";
}

/**
 * Minimum self-serve plan that unlocks the resource, derived from entitlements:
 * - Conversar → Essencial (chat_standard)
 * - Jornadas/Caminhos → Caminho (reading_journeys) — NOT Profundo
 */
export function minimumPlanForResource(
  resource: SoftPaywallResourceId,
): PlanKey {
  return resource === "jornadas" ? "caminho" : "essencial";
}

export type SoftPaywallCopy = {
  resourceId: SoftPaywallResourceId;
  resourceLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  benefits: string[];
  minimumPlanKey: PlanKey;
  minimumPlanName: string;
  badgeLabel: string;
  ctaLabel: string;
  ctaHref: string;
  /** Close-only label for the sheet dismiss control (does not navigate). */
  dismissLabel: string;
  /** Navigate label shown after dismiss when leaving the gated surface. */
  leaveLabel: string;
  dismissHref: string;
  footerNote: string;
};

export function getSoftPaywallCopy(
  resource: SoftPaywallResourceId,
): SoftPaywallCopy {
  const minimumPlanKey = minimumPlanForResource(resource);
  const plan = getPlanByKey(minimumPlanKey);
  const minimumPlanName = plan?.name ?? "Essencial";

  if (resource === "conversar") {
    return {
      resourceId: resource,
      resourceLabel: "Conversar",
      eyebrow: "ACOMPANHAMENTO",
      title: "Essencial abre Conversar",
      body: "Hoje e Espaço continuam grátis. Sem cartão para a presença diária.",
      benefits: [
        "Conversa personalizada com referências bíblicas",
        "Histórico privado para retomar",
        "Conta grátis continua com Hoje, Orações, Diário e Salvos",
      ],
      minimumPlanKey,
      minimumPlanName,
      badgeLabel: minimumPlanName,
      ctaLabel: "Ver planos",
      ctaHref: "/planos",
      dismissLabel: "Ficar no grátis",
      leaveLabel: "Voltar ao Hoje",
      dismissHref: "/inicio",
      footerNote: "Conta grátis continua · ritual diário intacto",
    };
  }

  return {
    resourceId: resource,
    resourceLabel: "Caminhos",
    eyebrow: "CAMINHOS",
    title: "Continue o caminho com acompanhamento",
    body: "Jornadas guiadas de 7 etapas sobre temas reais da vida — progresso salvo, no seu ritmo.",
    benefits: [
      "Jornadas de leitura guiadas",
      "Progresso salvo na conta",
      "Tudo do Essencial, com mais espaço para voltar",
    ],
    minimumPlanKey,
    minimumPlanName,
    badgeLabel: minimumPlanName,
    ctaLabel: "Ver planos",
    ctaHref: "/planos#comparar-uso",
    dismissLabel: "Ficar no grátis",
    leaveLabel: "Voltar ao Hoje",
    dismissHref: "/inicio",
    footerNote: "Conta grátis continua · ritual diário intacto",
  };
}

/** Free-account benefits shown on Conta when there is no paid plan. */
export const FREE_ACCOUNT_BENEFITS = [
  "Hoje com Deus",
  "Orações",
  "Diário",
  "Salvos",
] as const;

export const FREE_ACCOUNT_STATUS_LABEL = "Conta grátis ativa";
