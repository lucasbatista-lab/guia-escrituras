import "server-only";

import { isIsoCalendarDate } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import {
  JOURNAL_MAX_LEN,
  type PrivateEntry,
  type PrivateEntryKind,
} from "./types";

type EntryRow = {
  id: string;
  kind: string;
  body: string;
  local_date: string | null;
  journey_slug: string | null;
  step_id: string | null;
  created_at: string;
  updated_at: string;
};

const ENTRY_COLUMNS =
  "id, kind, body, local_date, journey_slug, step_id, created_at, updated_at";

function mapEntry(row: EntryRow): PrivateEntry {
  return {
    id: row.id,
    kind: row.kind as PrivateEntryKind,
    body: row.body,
    localDate: row.local_date,
    journeySlug: row.journey_slug,
    stepId: row.step_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPrivateEntries(
  userId: string,
  kind?: PrivateEntryKind,
): Promise<PrivateEntry[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("user_private_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as EntryRow[]).map(mapEntry);
}

export async function createPrivateEntry(input: {
  userId: string;
  kind: PrivateEntryKind;
  body: string;
  localDate?: string | null;
  journeySlug?: string | null;
  stepId?: string | null;
}): Promise<PrivateEntry | null> {
  const text = input.body.trim().slice(0, JOURNAL_MAX_LEN);
  if (!text) return null;
  const journeySlug = input.journeySlug?.trim().slice(0, 80) || null;
  const stepId = input.stepId?.trim().slice(0, 80) || null;
  if (input.kind === "journey_step" && (!journeySlug || !stepId)) return null;
  const localDate =
    input.localDate && isIsoCalendarDate(input.localDate)
      ? input.localDate
      : null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_private_entries")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      body: text,
      local_date: localDate,
      journey_slug: journeySlug,
      step_id: stepId,
    })
    .select(ENTRY_COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return mapEntry(data as EntryRow);
}

export async function updatePrivateEntry(
  userId: string,
  id: string,
  body: string,
): Promise<PrivateEntry | null> {
  const text = body.trim().slice(0, JOURNAL_MAX_LEN);
  if (!text) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_private_entries")
    .update({ body: text })
    .eq("user_id", userId)
    .eq("id", id)
    .select(ENTRY_COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return mapEntry(data as EntryRow);
}

export async function loadJourneyStepNote(
  userId: string,
  journeySlug: string,
  stepId: string,
): Promise<PrivateEntry | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_private_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .eq("kind", "journey_step")
    .eq("journey_slug", journeySlug)
    .eq("step_id", stepId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapEntry(data as EntryRow);
}

export async function deletePrivateEntry(
  userId: string,
  id: string,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("user_private_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}
