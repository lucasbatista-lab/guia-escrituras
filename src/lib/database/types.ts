import type { PlanKey } from "@/lib/entitlements";
import type { PreferredDepth, ResponseStyle, TraditionKey } from "@/lib/theology";

export interface ProfileRow {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpiritualProfileRow {
  userId: string;
  traditionKey: TraditionKey;
  denomination: string | null;
  preferredBibleTranslation: string | null;
  responseStyle: ResponseStyle;
  preferredDepth: PreferredDepth;
  saintsContentEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  planKey: PlanKey;
  status: string;
}

/** Mock admin metrics — no private conversation content. */
export interface AdminDashboardMetrics {
  subscribersByPlan: Array<{ planKey: PlanKey; count: number }>;
  activeUsers: number;
  estimatedMrrBrlCents: number;
  aiCostBrlCents: number;
  avgCostPerUserBrlCents: number;
  usagePercentiles: { p50: number; p90: number; p99: number };
  anomalousUsers: Array<{ userIdHash: string; signal: string }>;
  partners: Array<{ code: string; conversions: number; pendingRewards: number }>;
  conversions: number;
  renewals: number;
  pendingRewards: number;
}

export const MOCK_ADMIN_METRICS: AdminDashboardMetrics = {
  subscribersByPlan: [
    { planKey: "essencial", count: 128 },
    { planKey: "caminho", count: 86 },
    { planKey: "profundo", count: 24 },
    { planKey: "particular", count: 3 },
  ],
  activeUsers: 174,
  estimatedMrrBrlCents: 128 * 3800 + 86 * 5800 + 24 * 18800 + 3 * 98800,
  aiCostBrlCents: 41200,
  avgCostPerUserBrlCents: 237,
  usagePercentiles: { p50: 12, p90: 41, p99: 96 },
  anomalousUsers: [
    { userIdHash: "usr_a1", signal: "burst_diario" },
    { userIdHash: "usr_b2", signal: "custo_elevado" },
  ],
  partners: [
    { code: "PARCEIRO_A", conversions: 14, pendingRewards: 2 },
    { code: "PARCEIRO_B", conversions: 7, pendingRewards: 1 },
  ],
  conversions: 31,
  renewals: 112,
  pendingRewards: 3,
};
