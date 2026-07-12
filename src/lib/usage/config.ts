import type { PlanKey } from "@/lib/entitlements";
import type { MonthlyBudgetConfig } from "./types";

/** Orçamentos de planejamento por plano (centavos BRL). Não são cotas de mensagens. */
export const PLAN_BUDGET_CONFIG: Record<PlanKey, MonthlyBudgetConfig> = {
  essencial: {
    monthlyBudgetBrlCents: 1200,
    dailyBurstLimit: 40,
    alertThresholds: [0.7, 0.9, 1.0],
  },
  caminho: {
    monthlyBudgetBrlCents: 2200,
    dailyBurstLimit: 80,
    alertThresholds: [0.7, 0.9, 1.0],
  },
  profundo: {
    monthlyBudgetBrlCents: 8000,
    dailyBurstLimit: 150,
    alertThresholds: [0.7, 0.9, 1.0],
  },
  particular: {
    monthlyBudgetBrlCents: 35000,
    dailyBurstLimit: 400,
    alertThresholds: [0.7, 0.9, 1.0],
  },
};

export function getBudgetConfig(planKey: PlanKey): MonthlyBudgetConfig {
  return PLAN_BUDGET_CONFIG[planKey];
}
