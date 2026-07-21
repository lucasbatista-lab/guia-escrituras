import type { EntitlementKey, PlanKey } from "./types";
import { getPlanEntitlements } from "./plans";
import { isActiveEntitlementKey } from "./reserved";

export interface EntitlementResolutionInput {
  planKey: PlanKey;
  overrides?: EntitlementKey[];
  revoked?: EntitlementKey[];
}

export interface EntitlementResolution {
  planKey: PlanKey;
  entitlements: EntitlementKey[];
  has: (key: EntitlementKey) => boolean;
}

/**
 * Resolve *active* entitlements only. Reserved catalog keys remain on plan
 * definitions for roadmap/display filtering, but never grant via `has()`.
 */
export function resolveEntitlements(
  input: EntitlementResolutionInput,
): EntitlementResolution {
  const base = new Set(
    getPlanEntitlements(input.planKey).filter(isActiveEntitlementKey),
  );

  for (const key of input.overrides ?? []) {
    if (isActiveEntitlementKey(key)) base.add(key);
  }

  for (const key of input.revoked ?? []) {
    base.delete(key);
  }

  const entitlements = Array.from(base);

  return {
    planKey: input.planKey,
    entitlements,
    has: (key) => isActiveEntitlementKey(key) && entitlements.includes(key),
  };
}

export function requireEntitlement(
  resolution: EntitlementResolution,
  key: EntitlementKey,
): boolean {
  return resolution.has(key);
}
