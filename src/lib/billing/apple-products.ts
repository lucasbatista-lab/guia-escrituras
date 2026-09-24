import type { PlanKey } from "@/lib/entitlements";

/**
 * Env-driven Apple product → planKey mapping.
 * Product IDs are not final until App Store Connect is configured.
 * Never trust client-sent planKey; always map product id → plan.
 */

const ENV_BY_PLAN: Record<Exclude<PlanKey, "particular">, string> = {
  essencial: "APPLE_PRODUCT_ESSENCIAL",
  caminho: "APPLE_PRODUCT_CAMINHO",
  profundo: "APPLE_PRODUCT_PROFUNDO",
};

export function getAppleProductEnvName(
  planKey: Exclude<PlanKey, "particular">,
): string {
  return ENV_BY_PLAN[planKey];
}

export function getConfiguredAppleProductId(
  planKey: Exclude<PlanKey, "particular">,
): string | null {
  const envName = ENV_BY_PLAN[planKey];
  const value = process.env[envName]?.trim();
  return value || null;
}

export function planKeyFromAppleProductId(
  productId: string,
): Exclude<PlanKey, "particular"> | null {
  const normalized = productId.trim();
  if (!normalized) return null;

  for (const planKey of Object.keys(ENV_BY_PLAN) as Array<
    Exclude<PlanKey, "particular">
  >) {
    const configured = getConfiguredAppleProductId(planKey);
    if (configured && configured === normalized) return planKey;
  }
  return null;
}

/**
 * Recommended App Store Connect structure (not applied here):
 * One subscription group "Amém Chat" with three auto-renewable tiers
 * Essencial < Caminho < Profundo for coherent upgrades/downgrades.
 */
export const APPLE_SUBSCRIPTION_GROUP_RECOMMENDATION = {
  groupName: "Amém Chat",
  tiers: ["essencial", "caminho", "profundo"] as const,
} as const;
