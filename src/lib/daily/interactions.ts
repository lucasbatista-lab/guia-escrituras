import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDailyCheckinValue, type DailyCheckinValue } from "./checkin";
import { isIsoCalendarDate } from "./timezone";
import type { DailyInteractionPatch, UserDailyInteraction } from "./types";

type InteractionRow = {
  user_id: string;
  local_date: string;
  viewed_at: string | null;
  completed_at: string | null;
  saved_at: string | null;
  shared_at: string | null;
  checkin: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: InteractionRow): UserDailyInteraction {
  return {
    localDate: row.local_date,
    viewedAt: row.viewed_at,
    completedAt: row.completed_at,
    savedAt: row.saved_at,
    sharedAt: row.shared_at,
    checkin: isDailyCheckinValue(row.checkin) ? row.checkin : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadDailyInteraction(
  userId: string,
  localDate: string,
): Promise<UserDailyInteraction | null> {
  if (!isIsoCalendarDate(localDate)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_daily_interactions")
    .select(
      "user_id, local_date, viewed_at, completed_at, saved_at, shared_at, checkin, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as InteractionRow);
}

export async function loadDailyInteractionsForDates(
  userId: string,
  dates: string[],
): Promise<UserDailyInteraction[]> {
  const safeDates = dates.filter(isIsoCalendarDate);
  if (safeDates.length === 0) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_daily_interactions")
    .select(
      "user_id, local_date, viewed_at, completed_at, saved_at, shared_at, checkin, created_at, updated_at",
    )
    .eq("user_id", userId)
    .in("local_date", safeDates);
  if (error || !data) return [];
  return (data as InteractionRow[]).map(mapRow);
}

export async function upsertDailyInteraction(
  userId: string,
  patch: DailyInteractionPatch,
): Promise<UserDailyInteraction | null> {
  if (!isIsoCalendarDate(patch.localDate)) return null;
  const supabase = await createClient();
  if (!supabase) return null;

  const existing = await loadDailyInteraction(userId, patch.localDate);
  const now = new Date().toISOString();
  let checkin: DailyCheckinValue | null = existing?.checkin ?? null;
  if (patch.checkin === null) checkin = null;
  else if (patch.checkin && isDailyCheckinValue(patch.checkin)) {
    checkin = patch.checkin;
  }

  const row = {
    user_id: userId,
    local_date: patch.localDate,
    viewed_at: patch.viewed ? (existing?.viewedAt ?? now) : (existing?.viewedAt ?? now),
    completed_at: patch.completed
      ? (existing?.completedAt ?? now)
      : (existing?.completedAt ?? null),
    saved_at: patch.saved ? (existing?.savedAt ?? now) : (existing?.savedAt ?? null),
    shared_at: patch.shared ? (existing?.sharedAt ?? now) : (existing?.sharedAt ?? null),
    checkin,
  };

  const { data, error } = await supabase
    .from("user_daily_interactions")
    .upsert(row, { onConflict: "user_id,local_date" })
    .select(
      "user_id, local_date, viewed_at, completed_at, saved_at, shared_at, checkin, created_at, updated_at",
    )
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as InteractionRow);
}
