import type { MonthlyBudgetConfig } from "./types";

export type ShortRateLimitWindow = {
  windowSeconds: number;
  maxRequestIds: number;
};

export type ShortRateLimitConfig = {
  perMinute: ShortRateLimitWindow;
  perTenMinutes: ShortRateLimitWindow;
};

export function getShortRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): ShortRateLimitConfig {
  const perMinute = Number(env.CHAT_RATE_LIMIT_PER_MINUTE ?? "5");
  const perTenMinutes = Number(env.CHAT_RATE_LIMIT_PER_10_MINUTES ?? "20");
  return {
    perMinute: {
      windowSeconds: 60,
      maxRequestIds: Number.isFinite(perMinute) && perMinute > 0 ? perMinute : 5,
    },
    perTenMinutes: {
      windowSeconds: 600,
      maxRequestIds:
        Number.isFinite(perTenMinutes) && perTenMinutes > 0
          ? perTenMinutes
          : 20,
    },
  };
}

export type ShortRateLimitResult =
  | { blocked: false }
  | {
      blocked: true;
      retryAfterSeconds: number;
      windowSeconds: number;
      limit: number;
    };

/**
 * Short-term anti-burst using persisted distinct requestIds (user messages).
 * Callers must skip this when the same requestId is a retry.
 *
 * Defaults (identical for all paid plans — commercial daily/monthly quotas stay
 * separate in budget.ts):
 * - 5 distinct user messages / 60s
 * - 20 distinct user messages / 600s
 *
 * Rationale: human reflective chat rarely exceeds ~1 msg / 10–15s; 5/min allows
 * quick corrections without enabling scripted bursts. Plan budgets (daily burst +
 * monthly BRL) remain the commercial caps.
 */
export function evaluateShortRateLimit(input: {
  requestIdsInWindow: number;
  window: ShortRateLimitWindow;
}): ShortRateLimitResult {
  if (input.requestIdsInWindow >= input.window.maxRequestIds) {
    return {
      blocked: true,
      retryAfterSeconds: input.window.windowSeconds,
      windowSeconds: input.window.windowSeconds,
      limit: input.window.maxRequestIds,
    };
  }
  return { blocked: false };
}

export function evaluateShortRateLimits(input: {
  countLast60s: number;
  countLast10m: number;
  config?: ShortRateLimitConfig;
}): ShortRateLimitResult {
  const config = input.config ?? getShortRateLimitConfig();
  const minute = evaluateShortRateLimit({
    requestIdsInWindow: input.countLast60s,
    window: config.perMinute,
  });
  if (minute.blocked) return minute;
  return evaluateShortRateLimit({
    requestIdsInWindow: input.countLast10m,
    window: config.perTenMinutes,
  });
}

/** Keep monthly budget types referenced for exports stability. */
export type { MonthlyBudgetConfig };
