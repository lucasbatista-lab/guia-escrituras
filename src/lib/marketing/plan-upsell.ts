import type { PlanKey } from "@/lib/entitlements";

export type PlanUpsellOrigin =
  | "deep_not_entitled"
  | "usage_limit"
  | "account_compare";

export type PlanUpsellKind = "caminho" | "profundo" | "compare";

export type PlanUpsellSuggestion = {
  kind: PlanUpsellKind;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
};

/**
 * Ethical contextual upsell — only when the user hit a real product boundary.
 * Does not promise automatic plan change or expose internal budgets.
 */
export function getPlanUpsellSuggestion(input: {
  currentPlanKey: PlanKey | null | undefined;
  origin: PlanUpsellOrigin;
  limitKind?: "plan_limit" | "daily_burst";
}): PlanUpsellSuggestion | null {
  const plan = input.currentPlanKey;
  if (!plan || plan === "particular") return null;

  if (input.origin === "deep_not_entitled") {
    if (plan === "profundo") return null;
    return {
      kind: "profundo",
      title: "Aprofundar está no plano Profundo",
      body:
        "Quando uma situação pede mais contexto, conexões bíblicas e próximos passos, você pode acionar Aprofundar no chat — disponível no Profundo.",
      ctaLabel: "Conhecer o Profundo",
      href: "/planos#aprofundar",
    };
  }

  if (input.origin === "usage_limit") {
    if (plan === "profundo") return null;

    if (plan === "essencial") {
      const isDaily = input.limitKind === "daily_burst";
      return {
        kind: "caminho",
        title: isDaily
          ? "Limite diário do seu plano"
          : "Margem de uso do Essencial",
        body: isDaily
          ? "Este limite diário é temporário — amanhã você pode continuar. Se você costuma voltar várias vezes por semana, o Caminho oferece mais flexibilidade para conversas recorrentes."
          : "Você atingiu a margem de uso do Essencial por enquanto. Se o Amém Chat faz parte da sua rotina semanal, o Caminho foi pensado para uso mais frequente.",
        ctaLabel: "Comparar com o Caminho",
        href: "/planos#comparar-uso",
      };
    }

    if (plan === "caminho") {
      const isDaily = input.limitKind === "daily_burst";
      return {
        kind: "profundo",
        title: isDaily
          ? "Limite diário do seu plano"
          : "Margem de uso do Caminho",
        body: isDaily
          ? "Este limite diário é temporário — amanhã você pode continuar. Para uso mais intenso e Aprofundar sob demanda, o Profundo amplia a capacidade."
          : "Você atingiu a margem de uso do Caminho por enquanto. Para uso mais intenso e Aprofundar sob demanda, o Profundo foi pensado para esse ritmo.",
        ctaLabel: "Conhecer o Profundo",
        href: "/planos#aprofundar",
      };
    }
  }

  return null;
}
