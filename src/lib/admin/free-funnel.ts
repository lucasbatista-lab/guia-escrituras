import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_EVENT_NAMES } from "@/lib/product-events/types";
import { addCalendarDays, brtCalendarDate } from "@/lib/daily";
import { AdminMetricsError } from "./metrics";
import { assertAdminServiceAccess } from "./require-admin";
import {
  ADMIN_QUERY_MAX_PAGES,
  fetchAllRowsPaginated,
} from "./paginate";

const FUNNEL_EVENTS = [
  "free_account_created",
  "daily_opened",
  "daily_content_viewed",
  "daily_completed",
  "daily_saved",
  "daily_shared",
  "premium_prompt_viewed",
  "premium_prompt_clicked",
  "chat_started",
  "first_chat_completed",
] as const;

export type FreeFunnelWindow = "24h" | "7d" | "30d";

export type FreeFunnelCounts = Record<(typeof FUNNEL_EVENTS)[number], number> & {
  uniqueUsers: number;
};

export interface FreeFunnelReport {
  generatedAt: string;
  windows: Record<FreeFunnelWindow, FreeFunnelCounts>;
  d1: {
    cohortDate: string;
    activeOnCohort: number;
    returnedNextDay: number;
    ratePct: number | null;
    note: string;
  };
  partial: boolean;
}

function emptyCounts(): FreeFunnelCounts {
  const counts = { uniqueUsers: 0 } as FreeFunnelCounts;
  for (const name of FUNNEL_EVENTS) counts[name] = 0;
  return counts;
}

function admin() {
  try {
    return createAdminClient();
  } catch {
    throw new AdminMetricsError(
      "Métricas indisponíveis: configure SUPABASE_SECRET_KEY.",
    );
  }
}

function windowStart(window: FreeFunnelWindow, now: Date): Date {
  const ms =
    window === "24h"
      ? 24 * 60 * 60 * 1000
      : window === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - ms);
}

export function aggregateProductEventFunnel(
  rows: Array<{ event_name: string; user_id: string; created_at: string }>,
  sinceIso: string,
): FreeFunnelCounts {
  const counts = emptyCounts();
  const users = new Set<string>();
  for (const row of rows) {
    if (row.created_at < sinceIso) continue;
    if (!(PRODUCT_EVENT_NAMES as readonly string[]).includes(row.event_name)) {
      continue;
    }
    if (FUNNEL_EVENTS.includes(row.event_name as (typeof FUNNEL_EVENTS)[number])) {
      counts[row.event_name as (typeof FUNNEL_EVENTS)[number]] += 1;
      users.add(row.user_id);
    }
  }
  counts.uniqueUsers = users.size;
  return counts;
}

/** D1 from dated activity flags — never check-in / private text. */
export function deriveD1Return(
  rows: Array<{
    user_id: string;
    local_date: string;
    viewed_at: string | null;
    completed_at: string | null;
    saved_at: string | null;
  }>,
  cohortDate: string,
): { activeOnCohort: number; returnedNextDay: number; ratePct: number | null } {
  const next = addCalendarDays(cohortDate, 1);
  const active = new Set<string>();
  const returned = new Set<string>();
  for (const row of rows) {
    const valid = Boolean(row.viewed_at || row.completed_at || row.saved_at);
    if (!valid) continue;
    if (row.local_date === cohortDate) active.add(row.user_id);
    if (row.local_date === next) returned.add(row.user_id);
  }
  let returnedNextDay = 0;
  for (const userId of active) {
    if (returned.has(userId)) returnedNextDay += 1;
  }
  return {
    activeOnCohort: active.size,
    returnedNextDay,
    ratePct:
      active.size === 0
        ? null
        : Math.round((returnedNextDay / active.size) * 1000) / 10,
  };
}

export async function getAdminFreeFunnelReport(): Promise<FreeFunnelReport> {
  await assertAdminServiceAccess();
  const client = admin();
  const now = new Date();
  const since30 = windowStart("30d", now).toISOString();

  const events = await fetchAllRowsPaginated<{
    event_name: string;
    user_id: string;
    created_at: string;
  }>((from, to) =>
    client
      .from("product_events")
      .select("event_name, user_id, created_at")
      .gte("created_at", since30)
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  const yesterday = addCalendarDays(brtCalendarDate(now), -1);
  const sinceDate = addCalendarDays(yesterday, -1);
  const daily = await fetchAllRowsPaginated<{
    user_id: string;
    local_date: string;
    viewed_at: string | null;
    completed_at: string | null;
    saved_at: string | null;
  }>((from, to) =>
    client
      .from("user_daily_interactions")
      .select("user_id, local_date, viewed_at, completed_at, saved_at")
      .gte("local_date", sinceDate)
      .lte("local_date", brtCalendarDate(now))
      .order("local_date", { ascending: true })
      .range(from, to),
  );

  const d1 = deriveD1Return(daily.rows, yesterday);

  return {
    generatedAt: now.toISOString(),
    windows: {
      "24h": aggregateProductEventFunnel(
        events.rows,
        windowStart("24h", now).toISOString(),
      ),
      "7d": aggregateProductEventFunnel(
        events.rows,
        windowStart("7d", now).toISOString(),
      ),
      "30d": aggregateProductEventFunnel(events.rows, since30),
    },
    d1: {
      cohortDate: yesterday,
      ...d1,
      note: "Derivado de user_daily_interactions (viewed/completed/saved). Sem check-in e sem texto privado.",
    },
    partial: events.partial || daily.partial || events.pagesRead >= ADMIN_QUERY_MAX_PAGES,
  };
}

export { FUNNEL_EVENTS };
