import "server-only";

import { getAuthUserContext } from "@/lib/auth";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import { AppError } from "@/lib/safety";

export async function requireJourneySession() {
  const auth = await getAuthUserContext();
  if (!auth) {
    throw new AppError(
      "unauthorized",
      "Faça login para continuar.",
      401,
      "unauthorized",
    );
  }
  return auth;
}

export async function requireJourneyEntitlement() {
  const auth = await requireJourneySession();
  if (!canUseReadingJourneys(auth.planKey)) {
    throw new AppError(
      "journeys_not_entitled",
      "Jornadas de leitura guiadas estão disponíveis nos planos Caminho, Profundo e Particular.",
      403,
      "journeys_not_entitled",
    );
  }
  return auth;
}
