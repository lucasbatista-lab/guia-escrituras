import "server-only";

import { maskUserId } from "@/lib/logging/mask";
import { logger } from "@/lib/logging/logger";
import type { PlanKey } from "@/lib/entitlements";

export type PlanConversionEventName =
  | "plan_comparison_viewed"
  | "deep_upsell_viewed"
  | "usage_limit_upsell_viewed"
  | "upgrade_interest_clicked";

export type PlanConversionEventInput = {
  event: PlanConversionEventName;
  userId?: string | null;
  currentPlanKey?: PlanKey | null;
  targetPlanKey?: PlanKey | null;
  origin?: string;
  outcome?: "success" | "failure";
};

/**
 * Structured operational events for upgrade interest — no conversation content.
 * Uses existing logger only (no new tables/migrations).
 */
export function logPlanConversionEvent(input: PlanConversionEventInput): void {
  logger.info("plan_conversion_event", {
    event: input.event,
    userId: maskUserId(input.userId ?? undefined),
    currentPlanKey: input.currentPlanKey ?? null,
    targetPlanKey: input.targetPlanKey ?? null,
    origin: input.origin ?? null,
    outcome: input.outcome ?? "success",
  });
}
