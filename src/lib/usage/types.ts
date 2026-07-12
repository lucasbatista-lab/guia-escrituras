export type FeatureType =
  | "chat_standard"
  | "chat_deep"
  | "voice"
  | "summary"
  | "custom_content";

export type UsageLevel = "normal" | "elevated" | "near_limit" | "blocked";

export interface UsageEventRecord {
  requestId: string;
  userId: string;
  featureType: FeatureType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsdMicros: number;
  estimatedCostBrlCents: number;
  latencyMs: number;
  success: boolean;
  createdAt: string;
}

export interface MonthlyBudgetConfig {
  /** Soft monthly budget in BRL cents (planning). */
  monthlyBudgetBrlCents: number;
  /** Daily burst limit in request count. */
  dailyBurstLimit: number;
  /** Alert thresholds as fractions of monthly budget. */
  alertThresholds: number[];
}

export interface BudgetStatus {
  usedBrlCents: number;
  budgetBrlCents: number;
  usageRatio: number;
  level: UsageLevel;
  alertsTriggered: number[];
  blocked: boolean;
  blockReason?: string;
}

export interface BurstStatus {
  requestsToday: number;
  dailyBurstLimit: number;
  blocked: boolean;
  remaining: number;
}

/** Franquia flexível: não exige uso uniforme dia a dia. */
export interface FlexibleAllowanceStatus {
  daysElapsedInMonth: number;
  daysInMonth: number;
  expectedMinRatio: number;
  isAheadOfPace: boolean;
  isBehindPace: boolean;
}
