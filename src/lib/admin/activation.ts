import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/safety";
import { selectEffectiveSubscriptionsByUser } from "@/lib/billing/effective-subscription";
import {
  ADMIN_QUERY_MAX_PAGES,
  ADMIN_QUERY_PAGE_SIZE,
  fetchAllRowsPaginated,
} from "./paginate";
import { assertAdminServiceAccess } from "./require-admin";
import { AdminMetricsError, startOfOperationalDayIso } from "./metrics";
import {
  fetchDistinctConversationUserIds,
  fetchLiveAndPastDueCandidates,
} from "./users";

function admin() {
  try {
    return createAdminClient();
  } catch {
    throw new AdminMetricsError(
      "Métricas indisponíveis: configure SUPABASE_SECRET_KEY.",
    );
  }
}

export interface AdminJourneyProgressRow {
  journeySlug: string;
  completedStepIds: string[] | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AdminJourneyAggregates {
  journeysStarted: number;
  journeysCompleted: number;
  journeysInProgress: number;
  distribution: Array<{ journeySlug: string; started: number; completed: number }>;
}

function isJourneyStarted(row: AdminJourneyProgressRow): boolean {
  return Boolean(row.startedAt) || (row.completedStepIds?.length ?? 0) > 0;
}

/** Pure aggregation over journey_progress rows — one row per (user, journey). */
export function aggregateJourneyProgress(
  rows: AdminJourneyProgressRow[],
): AdminJourneyAggregates {
  const byJourney = new Map<string, { started: number; completed: number }>();
  let journeysStarted = 0;
  let journeysCompleted = 0;
  let journeysInProgress = 0;

  for (const row of rows) {
    const started = isJourneyStarted(row);
    const completed = Boolean(row.completedAt);
    if (!started) continue;

    journeysStarted += 1;
    if (completed) journeysCompleted += 1;
    else journeysInProgress += 1;

    const bucket = byJourney.get(row.journeySlug) ?? { started: 0, completed: 0 };
    bucket.started += 1;
    if (completed) bucket.completed += 1;
    byJourney.set(row.journeySlug, bucket);
  }

  const distribution = [...byJourney.entries()]
    .map(([journeySlug, counts]) => ({ journeySlug, ...counts }))
    .sort((a, b) => b.started - a.started || a.journeySlug.localeCompare(b.journeySlug));

  return { journeysStarted, journeysCompleted, journeysInProgress, distribution };
}

export interface AdminActivationMetrics {
  generatedAt: string;
  operationalDayLabel: string;
  /** New profiles since start of current America/Sao_Paulo day. */
  newUsersToday: number;
  /** Rolling 7-day window (not a calendar week). */
  newUsers7d: number;
  /** Rolling 30-day window (not a calendar month). */
  newUsers30d: number;
  registeredUsers: number;
  activeOrTrialingUsers: number;
  activeOrTrialingPartial: boolean;
  activeOrTrialingWithZeroConversations: number;
  activeOrTrialingWithZeroConversationsPartial: boolean;
  usersWithAtLeastOneConversation: number;
  usersWithAtLeastOneConversationPartial: boolean;
  journeysStarted: number;
  journeysCompleted: number;
  journeysInProgress: number;
  journeyDistribution: Array<{ journeySlug: string; started: number; completed: number }>;
  journeyDataPartial: boolean;
  /** Deep/Aprofundar usage needs usage_events aggregation — not precise here. */
  aprofundarAvailabilityNote: string;
}

export async function getAdminActivationMetrics(): Promise<AdminActivationMetrics> {
  await assertAdminServiceAccess();
  const client = admin();
  const now = new Date();
  const generatedAt = now.toISOString();
  const operationalDayStartIso = startOfOperationalDayIso(now);
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    profiles,
    profilesToday,
    profiles7,
    profiles30,
    { live, partial: liveSubscriptionsPartial },
    conversationUsers,
    journeyRows,
  ] = await Promise.all([
    client.from("profiles").select("id", { count: "exact", head: true }),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", operationalDayStartIso),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d7),
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d30),
    fetchLiveAndPastDueCandidates(),
    fetchDistinctConversationUserIds(),
    fetchAllRowsPaginated<{
      journey_slug: string;
      completed_step_ids: string[] | null;
      started_at: string | null;
      completed_at: string | null;
    }>(
      (from, to) =>
        client
          .from("journey_progress")
          .select("journey_slug, completed_step_ids, started_at, completed_at")
          .order("user_id", { ascending: true })
          .range(from, to),
      { pageSize: ADMIN_QUERY_PAGE_SIZE, maxPages: ADMIN_QUERY_MAX_PAGES },
    ),
  ]);

  if (profiles.error || profilesToday.error || profiles7.error || profiles30.error) {
    throw new AppError("admin_query_failed", "admin_query_failed", 500);
  }

  const { effective } = selectEffectiveSubscriptionsByUser(live);
  const activeOrTrialingUserIds = new Set(effective.map((row) => row.userId));

  let activeOrTrialingWithZeroConversations = 0;
  for (const userId of activeOrTrialingUserIds) {
    if (!conversationUsers.ids.has(userId)) {
      activeOrTrialingWithZeroConversations += 1;
    }
  }

  const journeyAggregates = aggregateJourneyProgress(
    journeyRows.rows.map((row) => ({
      journeySlug: row.journey_slug,
      completedStepIds: row.completed_step_ids,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })),
  );

  return {
    generatedAt,
    operationalDayLabel: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    newUsersToday: profilesToday.count ?? 0,
    newUsers7d: profiles7.count ?? 0,
    newUsers30d: profiles30.count ?? 0,
    registeredUsers: profiles.count ?? 0,
    activeOrTrialingUsers: activeOrTrialingUserIds.size,
    activeOrTrialingPartial: liveSubscriptionsPartial,
    activeOrTrialingWithZeroConversations,
    activeOrTrialingWithZeroConversationsPartial: conversationUsers.partial,
    usersWithAtLeastOneConversation: conversationUsers.ids.size,
    usersWithAtLeastOneConversationPartial: conversationUsers.partial,
    journeysStarted: journeyAggregates.journeysStarted,
    journeysCompleted: journeyAggregates.journeysCompleted,
    journeysInProgress: journeyAggregates.journeysInProgress,
    journeyDistribution: journeyAggregates.distribution,
    journeyDataPartial: journeyRows.partial,
    aprofundarAvailabilityNote: "Ainda não disponível com precisão",
  };
}
