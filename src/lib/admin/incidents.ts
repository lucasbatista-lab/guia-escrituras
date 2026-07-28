import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/safety";
import { assertAdminServiceAccess } from "./require-admin";
import { AdminMetricsError, startOfOperationalDayIso } from "./metrics";

function admin() {
  try {
    return createAdminClient();
  } catch {
    throw new AdminMetricsError(
      "Métricas indisponíveis: configure SUPABASE_SECRET_KEY.",
    );
  }
}

/**
 * usage_events.model is set to this exact technical marker by the crisis
 * safety intercept (src/lib/ai/chat-service.ts) — never message content.
 */
export const CRISIS_MARKER_MODEL_VALUE = "crisis_safety";

export interface AdminCrisisSnapshot {
  interceptionsToday: number;
  interceptions7d: number;
  interceptions30d: number;
  markerNote: string;
}

async function countCrisisMarker(
  client: ReturnType<typeof admin>,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await client
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("model", CRISIS_MARKER_MODEL_VALUE)
    .gte("created_at", sinceIso);
  if (error) {
    throw new AppError("admin_query_failed", "admin_query_failed", 500);
  }
  return count ?? 0;
}

/**
 * Crisis interception counts from the `model` technical marker column only
 * — never reads message content. Counts, not text, so no privacy exposure.
 */
export async function getAdminCrisisSnapshot(): Promise<AdminCrisisSnapshot> {
  await assertAdminServiceAccess();
  const client = admin();
  const now = new Date();
  const todayStartIso = startOfOperationalDayIso(now);
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [today, d7Count, d30Count] = await Promise.all([
    countCrisisMarker(client, todayStartIso),
    countCrisisMarker(client, d7),
    countCrisisMarker(client, d30),
  ]);

  return {
    interceptionsToday: today,
    interceptions7d: d7Count,
    interceptions30d: d30Count,
    markerNote:
      "Contagem via marcador técnico usage_events.model = crisis_safety — nunca lê conteúdo de mensagens.",
  };
}

