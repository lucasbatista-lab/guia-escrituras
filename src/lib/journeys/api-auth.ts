import "server-only";

import {
  FEATURE_TEMPORARILY_DISABLED_CODE,
  featureDisabledUserMessage,
  isFeatureDisabled,
} from "@/config/feature-kill-switches";
import { getAuthUserContext } from "@/lib/auth";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
  READING_JOURNEYS_NOT_ENTITLED_MESSAGE,
} from "@/lib/journeys/entitlement";
import { getJourneyStepById } from "@/lib/journeys/registry";
import { AppError } from "@/lib/safety";

export async function requireJourneySession() {
  const auth = await getAuthUserContext();
  if (!auth) {
    throw new AppError(
      "unauthorized",
      "unauthorized",
      401,
      "Faça login para continuar.",
    );
  }
  return auth;
}

function assertJourneysFeatureEnabled() {
  if (isFeatureDisabled("journeys")) {
    throw new AppError(
      FEATURE_TEMPORARILY_DISABLED_CODE,
      FEATURE_TEMPORARILY_DISABLED_CODE,
      503,
      featureDisabledUserMessage("journeys"),
    );
  }
}

export async function requireJourneyEntitlement() {
  const auth = await requireJourneySession();
  assertJourneysFeatureEnabled();
  if (!canUseReadingJourneys(auth.planKey)) {
    throw new AppError(
      "journeys_not_entitled",
      "journeys_not_entitled",
      403,
      READING_JOURNEYS_NOT_ENTITLED_MESSAGE,
    );
  }
  return auth;
}

/**
 * Start is always day-one — allow FREE/Essencial preview without granting
 * `reading_journeys`. Full list/reset stay on requireJourneyEntitlement.
 */
export async function requireJourneyPreviewStart() {
  const auth = await requireJourneySession();
  assertJourneysFeatureEnabled();
  return auth;
}

/**
 * Complete step: full entitlement OR explicit day-one preview exception.
 * Never grants fake reading_journeys for days 2+.
 */
export async function requireJourneyEntitlementOrPreviewStep(input: {
  journeySlug: string;
  stepId: string;
}) {
  const auth = await requireJourneySession();
  assertJourneysFeatureEnabled();
  if (canUseReadingJourneys(auth.planKey)) return auth;

  const step = getJourneyStepById(input.journeySlug, input.stepId);
  if (step && canAccessJourneyStep(auth.planKey, step.number)) {
    return auth;
  }

  throw new AppError(
    "journeys_not_entitled",
    "journeys_not_entitled",
    403,
    READING_JOURNEYS_NOT_ENTITLED_MESSAGE,
  );
}
