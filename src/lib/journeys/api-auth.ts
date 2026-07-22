import "server-only";

import {
  FEATURE_TEMPORARILY_DISABLED_CODE,
  featureDisabledUserMessage,
  isFeatureDisabled,
} from "@/config/feature-kill-switches";
import { getAuthUserContext } from "@/lib/auth";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
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

export async function requireJourneyEntitlement() {
  const auth = await requireJourneySession();
  if (isFeatureDisabled("journeys")) {
    throw new AppError(
      FEATURE_TEMPORARILY_DISABLED_CODE,
      FEATURE_TEMPORARILY_DISABLED_CODE,
      503,
      featureDisabledUserMessage("journeys"),
    );
  }
  if (!canUseReadingJourneys(auth.planKey)) {
    throw new AppError(
      "journeys_not_entitled",
      "journeys_not_entitled",
      403,
      "Jornadas de leitura guiadas estão disponíveis nos planos Caminho, Profundo e Particular.",
    );
  }
  return auth;
}
