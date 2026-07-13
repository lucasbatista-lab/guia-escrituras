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

/** Admin dashboard metrics shape (real data via admin service). */
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
