import "server-only";

import { getDailyContentForDate, isIsoCalendarDate } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import type { SavedItem, SavedItemType } from "./types";

type SavedRow = {
  id: string;
  item_type: string;
  item_key: string;
  created_at: string;
};

function titleFor(type: SavedItemType, key: string): { title: string; href: string | null } {
  if (type === "daily" && isIsoCalendarDate(key)) {
    const content = getDailyContentForDate(key);
    return {
      title: `${content.scriptureReference} · ${content.title}`,
      href: "/inicio",
    };
  }
  return { title: key, href: null };
}

function mapSaved(row: SavedRow): SavedItem {
  const itemType = row.item_type as SavedItemType;
  const meta = titleFor(itemType, row.item_key);
  return {
    id: row.id,
    itemType,
    itemKey: row.item_key,
    createdAt: row.created_at,
    title: meta.title,
    href: meta.href,
  };
}

export async function listSavedItems(userId: string): Promise<SavedItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_saved_items")
    .select("id, item_type, item_key, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const fromTable = error || !data ? [] : (data as SavedRow[]).map(mapSaved);

  const { data: daily } = await supabase
    .from("user_daily_interactions")
    .select("local_date, saved_at")
    .eq("user_id", userId)
    .not("saved_at", "is", null)
    .order("local_date", { ascending: false })
    .limit(30);

  const known = new Set(
    fromTable
      .filter((item) => item.itemType === "daily")
      .map((item) => item.itemKey),
  );
  const fromDaily: SavedItem[] = [];
  for (const row of daily ?? []) {
    const key = String(row.local_date);
    if (known.has(key) || !isIsoCalendarDate(key)) continue;
    const meta = titleFor("daily", key);
    fromDaily.push({
      id: `daily:${key}`,
      itemType: "daily",
      itemKey: key,
      createdAt: String(row.saved_at),
      title: meta.title,
      href: meta.href,
    });
  }

  return [...fromTable, ...fromDaily].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function saveItem(
  userId: string,
  itemType: SavedItemType,
  itemKey: string,
): Promise<SavedItem | null> {
  const key = itemKey.trim().slice(0, 80);
  if (!key) return null;
  if (itemType === "daily" && !isIsoCalendarDate(key)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_saved_items")
    .upsert(
      { user_id: userId, item_type: itemType, item_key: key },
      { onConflict: "user_id,item_type,item_key" },
    )
    .select("id, item_type, item_key, created_at")
    .maybeSingle();
  if (error || !data) return null;
  return mapSaved(data as SavedRow);
}
