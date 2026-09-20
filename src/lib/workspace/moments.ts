import "server-only";

import { brtCalendarDate } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";

/** Count real reflection moments this BRT month. Not a consecutive-day metric. */
export async function countMonthlyReflectionMoments(
  userId: string,
): Promise<number> {
  try {
    const supabase = await createClient();
    if (!supabase) return 0;
    const today = brtCalendarDate();
    const monthStart = `${today.slice(0, 7)}-01`;

    const [
      { count: dailyCount },
      { count: prayerCount },
      { count: journalCount },
    ] = await Promise.all([
      supabase
        .from("user_daily_interactions")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("local_date", monthStart)
        .or("completed_at.not.is.null,checkin.not.is.null,saved_at.not.is.null"),
      supabase
        .from("user_prayers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${monthStart}T00:00:00-03:00`),
      supabase
        .from("user_private_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("kind", ["journal", "gratitude"])
        .gte("created_at", `${monthStart}T00:00:00-03:00`),
    ]);

    return (dailyCount ?? 0) + (prayerCount ?? 0) + (journalCount ?? 0);
  } catch {
    return 0;
  }
}

export function monthlyMomentsCopy(count: number): string | null {
  if (count <= 0) return null;
  const noun = count === 1 ? "momento" : "momentos";
  return `Você reservou ${count} ${noun} de reflexão neste mês.`;
}
