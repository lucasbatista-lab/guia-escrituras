import { getPlanByKey, type PlanKey } from "@/lib/entitlements";
import type { UserJourneyState } from "@/lib/journey/journey-state";

/** Premium surfaces that FREE accounts may open via SoftPaywallSheet (no silent redirect). */
export type SoftPaywallResourceId = "conversar" | "jornadas";

/**
 * Viewer account context for SoftPaywall copy.
 * Paid viewers must never see “conta grátis” language.
 */
export type SoftPaywallViewer =
  | { kind: "free" }
  | { kind: "plan"; planKey: PlanKey };

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

export function softPaywallViewerFromPlanKey(
  planKey: PlanKey | null | undefined,
): SoftPaywallViewer {
  if (!planKey) return { kind: "free" };
  return { kind: "plan", planKey };
}

export type SoftPaywallCopy = {
  resourceId: SoftPaywallResourceId;
  resourceLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Short note on the closed teaser card (must not claim “grátis” for paid). */
  teaserBody: string;
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
  /** Surface path for product_events (allowlisted). */
  analyticsPath: "/conversar" | "/hoje" | "/planos" | "/jornadas";
  /** Optional static proof block (Conversar SoftPaywall). */
  showConversarProof?: boolean;
};

function isPaidViewer(viewer: SoftPaywallViewer): boolean {
  return viewer.kind === "plan";
}

export function getSoftPaywallCopy(
  resource: SoftPaywallResourceId,
  viewer: SoftPaywallViewer = { kind: "free" },
): SoftPaywallCopy {
  const minimumPlanKey = minimumPlanForResource(resource);
  const plan = getPlanByKey(minimumPlanKey);
  const minimumPlanName = plan?.name ?? "Essencial";
  const paid = isPaidViewer(viewer);

  if (resource === "conversar") {
    return {
      resourceId: resource,
      resourceLabel: "Conversar",
      eyebrow: "ACOMPANHAMENTO",
      title: "Continue essa reflexão em Conversar",
      body: "Traga a situação com suas palavras e receba clareza com Escrituras — com histórico privado para retomar.",
      teaserBody: paid
        ? `Disponível a partir do plano ${minimumPlanName}. Seu plano atual não inclui Conversar.`
        : `Disponível a partir do plano ${minimumPlanName}. Hoje e Espaço continuam na conta grátis.`,
      benefits: [
        "Sua situação · Escrituras úteis · um próximo passo",
        "Histórico privado para retomar quando quiser",
        paid
          ? "Hoje e Espaço continuam na mesma conta"
          : "Hoje e Espaço continuam grátis, sem cartão",
      ],
      minimumPlanKey,
      minimumPlanName,
      badgeLabel: minimumPlanName,
      ctaLabel: "Ver planos",
      ctaHref: "/planos",
      dismissLabel: paid ? "Agora não" : "Ficar no grátis",
      leaveLabel: "Voltar ao Hoje",
      dismissHref: "/inicio",
      footerNote: paid
        ? "Sua conta permanece · você escolhe quando conversar"
        : "Conta grátis continua · ritual diário intacto",
      analyticsPath: "/conversar",
      showConversarProof: true,
    };
  }

  const essencialViewer =
    viewer.kind === "plan" && viewer.planKey === "essencial";

  return {
    resourceId: resource,
    resourceLabel: "Caminhos",
    eyebrow: "CAMINHOS",
    title: "Continue os 7 dias deste Caminho",
    body: essencialViewer
      ? "Dia 1 continua aberto no Essencial. Os dias seguintes e o progresso completo ficam no plano Caminho."
      : "7 dias com um tema real — progresso salvo. Dia 1 continua aberto na conta grátis.",
    teaserBody: essencialViewer
      ? `Disponível no plano ${minimumPlanName}. Dia 1 continua aberto no Essencial.`
      : paid
        ? `Disponível no plano ${minimumPlanName}.`
        : `Disponível no plano ${minimumPlanName}. Dia 1 continua aberto na conta grátis.`,
    benefits: [
      "Continue os próximos dias no seu ritmo",
      "Progresso salvo na conta",
      essencialViewer
        ? "Dia 1 continua aberto no Essencial"
        : "Dia 1 continua aberto · sem cartão",
    ],
    minimumPlanKey,
    minimumPlanName,
    badgeLabel: minimumPlanName,
    ctaLabel: "Ver planos",
    ctaHref: "/planos#comparar-uso",
    dismissLabel: essencialViewer
      ? "Continuar no Essencial"
      : paid
        ? "Agora não"
        : "Ficar no grátis",
    leaveLabel: "Voltar ao Hoje",
    dismissHref: "/inicio",
    footerNote: essencialViewer
      ? "Seu Essencial continua com Conversar, Hoje e Espaço"
      : paid
        ? "Sua conta permanece · você escolhe quando aprofundar"
        : "Conta grátis continua · ritual diário intacto",
    analyticsPath: "/jornadas",
  };
}

/** Free-account benefits shown on Conta when there is no paid plan. */
export const FREE_ACCOUNT_BENEFITS = [
  "Hoje com Deus",
  "Orações",
  "Diário",
  "Salvos",
  "Dia 1 dos Caminhos",
] as const;

export const FREE_ACCOUNT_STATUS_LABEL = "Conta grátis ativa";
