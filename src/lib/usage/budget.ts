import type { BudgetStatus, MonthlyBudgetConfig, UsageLevel } from "./types";

export function computeUsageRatio(used: number, budget: number): number {
  if (budget <= 0) return used > 0 ? Number.POSITIVE_INFINITY : 0;
  return used / budget;
}

export function resolveUsageLevel(ratio: number): UsageLevel {
  if (ratio >= 1) return "blocked";
  if (ratio >= 0.9) return "near_limit";
  if (ratio >= 0.7) return "elevated";
  return "normal";
}

export function evaluateMonthlyBudget(input: {
  usedBrlCents: number;
  config: MonthlyBudgetConfig;
  abuseFlagged?: boolean;
}): BudgetStatus {
  const ratio = computeUsageRatio(
    input.usedBrlCents,
    input.config.monthlyBudgetBrlCents,
  );
  const alertsTriggered = input.config.alertThresholds.filter(
    (threshold) => ratio >= threshold,
  );
  const level = resolveUsageLevel(ratio);
  const blocked = Boolean(input.abuseFlagged) || ratio >= 1;

  return {
    usedBrlCents: input.usedBrlCents,
    budgetBrlCents: input.config.monthlyBudgetBrlCents,
    usageRatio: ratio,
    level: input.abuseFlagged ? "blocked" : level,
    alertsTriggered,
    blocked,
    blockReason: input.abuseFlagged
      ? "Uso temporariamente pausado por segurança. Entre em contato com o suporte."
      : blocked
        ? "Você atingiu o limite de uso do período. O acesso retorna no próximo ciclo."
        : undefined,
  };
}

export function evaluateDailyBurst(input: {
  requestsToday: number;
  dailyBurstLimit: number;
}): {
  requestsToday: number;
  dailyBurstLimit: number;
  blocked: boolean;
  remaining: number;
} {
  const remaining = Math.max(
    0,
    input.dailyBurstLimit - input.requestsToday,
  );
  return {
    requestsToday: input.requestsToday,
    dailyBurstLimit: input.dailyBurstLimit,
    blocked: input.requestsToday >= input.dailyBurstLimit,
    remaining,
  };
}

/**
 * Franquia flexível: o usuário pode concentrar uso em poucos dias,
 * desde que o orçamento mensal e o burst diário sejam respeitados.
 */
export function evaluateFlexibleAllowance(input: {
  usedBrlCents: number;
  budgetBrlCents: number;
  dayOfMonth: number;
  daysInMonth: number;
}): {
  daysElapsedInMonth: number;
  daysInMonth: number;
  expectedMinRatio: number;
  isAheadOfPace: boolean;
  isBehindPace: boolean;
} {
  const elapsed = Math.min(
    Math.max(input.dayOfMonth, 1),
    input.daysInMonth,
  );
  const expectedMinRatio = elapsed / input.daysInMonth;
  const actualRatio = computeUsageRatio(
    input.usedBrlCents,
    input.budgetBrlCents,
  );

  return {
    daysElapsedInMonth: elapsed,
    daysInMonth: input.daysInMonth,
    expectedMinRatio,
    isAheadOfPace: actualRatio > expectedMinRatio * 1.25,
    isBehindPace: actualRatio < expectedMinRatio * 0.5,
  };
}

export function usageLevelLabel(level: UsageLevel): string {
  switch (level) {
    case "normal":
      return "Uso normal";
    case "elevated":
      return "Uso elevado";
    case "near_limit":
      return "Próximo do limite";
    case "blocked":
      return "Limite atingido";
  }
}
