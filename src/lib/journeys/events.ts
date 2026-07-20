import "server-only";

import { maskUserId } from "@/lib/logging/mask";
import { logger } from "@/lib/logging/logger";
import type { PlanKey } from "@/lib/entitlements";

export type JourneyOperationalEventName =
  | "journey_catalog_viewed"
  | "journey_started"
  | "journey_step_completed"
  | "journey_completed"
  | "journey_chat_prefill_opened"
  | "journey_reset";

export function logJourneyOperationalEvent(input: {
  event: JourneyOperationalEventName;
  userId?: string | null;
  planKey?: PlanKey | null;
  journeySlug?: string | null;
  stepId?: string | null;
  origin?: string;
}): void {
  logger.info("journey_operational_event", {
    event: input.event,
    userId: maskUserId(input.userId ?? undefined),
    planKey: input.planKey ?? null,
    journeySlug: input.journeySlug ?? null,
    stepId: input.stepId ?? null,
    origin: input.origin ?? null,
  });
}
