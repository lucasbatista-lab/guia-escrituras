import type { EntitlementKey, PlanKey } from "./types";
import { getPlanEntitlements } from "./plans";

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

export function resolveEntitlements(
  input: EntitlementResolutionInput,
): EntitlementResolution {
  const base = new Set(getPlanEntitlements(input.planKey));

  for (const key of input.overrides ?? []) {
    base.add(key);
  }

  for (const key of input.revoked ?? []) {
    base.delete(key);
  }

  const entitlements = Array.from(base);

  return {
    planKey: input.planKey,
    entitlements,
    has: (key) => entitlements.includes(key),
  };
}

export function requireEntitlement(
  resolution: EntitlementResolution,
  key: EntitlementKey,
): boolean {
  return resolution.has(key);
}
