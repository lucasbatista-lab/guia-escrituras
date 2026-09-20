#!/usr/bin/env node
/**
 * FREE product funnel from product_events + D1 from user_daily_interactions.
 * Requires SUPABASE_URL + SUPABASE_SECRET_KEY. Never prints event payloads
 * (there are none) or private text columns.
 *
 *   node scripts/free-funnel-report.cjs
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

function brtToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

async function main() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("product_events")
    .select("event_name")
    .gte("created_at", since);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const counts = {};
  for (const row of data || []) {
    counts[row.event_name] = (counts[row.event_name] || 0) + 1;
  }
  console.log("product_events last 30d (counts only):");
  console.log(JSON.stringify(counts, null, 2));

  const yesterday = addDays(brtToday(), -1);
  const { data: daily, error: dailyError } = await client
    .from("user_daily_interactions")
    .select("user_id, local_date, viewed_at, completed_at, saved_at")
    .gte("local_date", addDays(yesterday, -1))
    .lte("local_date", brtToday());
  if (dailyError) {
    console.error(dailyError.message);
    process.exit(1);
  }
  const active = new Set();
  const next = new Set();
  const nextDate = addDays(yesterday, 1);
  for (const row of daily || []) {
    if (!(row.viewed_at || row.completed_at || row.saved_at)) continue;
    if (row.local_date === yesterday) active.add(row.user_id);
    if (row.local_date === nextDate) next.add(row.user_id);
  }
  let returned = 0;
  for (const id of active) if (next.has(id)) returned += 1;
  console.log(
    `D1 cohort ${yesterday}: ${returned}/${active.size} returned next day (viewed/completed/saved only).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
