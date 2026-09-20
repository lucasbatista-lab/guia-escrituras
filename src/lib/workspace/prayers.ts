import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PRAYER_MAX_LEN, type PrayerStatus, type UserPrayer } from "./types";

type PrayerRow = {
  id: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  answered_at: string | null;
};

function mapPrayer(row: PrayerRow): UserPrayer {
  return {
    id: row.id,
    body: row.body,
    status: row.status === "answered" ? "answered" : "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answeredAt: row.answered_at,
  };
}

export async function listPrayers(userId: string): Promise<UserPrayer[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_prayers")
    .select("id, body, status, created_at, updated_at, answered_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as PrayerRow[]).map(mapPrayer);
}

export async function createPrayer(
  userId: string,
  body: string,
): Promise<UserPrayer | null> {
  const text = body.trim().slice(0, PRAYER_MAX_LEN);
  if (!text) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_prayers")
    .insert({ user_id: userId, body: text, status: "open" })
    .select("id, body, status, created_at, updated_at, answered_at")
    .maybeSingle();
  if (error || !data) return null;
  return mapPrayer(data as PrayerRow);
}

export async function updatePrayer(
  userId: string,
  id: string,
  patch: { body?: string; status?: PrayerStatus },
): Promise<UserPrayer | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const updates: Record<string, unknown> = {};
  if (typeof patch.body === "string") {
    const text = patch.body.trim().slice(0, PRAYER_MAX_LEN);
    if (!text) return null;
    updates.body = text;
  }
  if (patch.status === "answered") {
    updates.status = "answered";
    updates.answered_at = new Date().toISOString();
  } else if (patch.status === "open") {
    updates.status = "open";
    updates.answered_at = null;
  }
  const { data, error } = await supabase
    .from("user_prayers")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", id)
    .select("id, body, status, created_at, updated_at, answered_at")
    .maybeSingle();
  if (error || !data) return null;
  return mapPrayer(data as PrayerRow);
}

export async function deletePrayer(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("user_prayers")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}
