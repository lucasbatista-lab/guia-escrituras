#!/usr/bin/env node
/**
 * Acquisition funnel report by BRT day, campaign, utm_content.
 * Requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SECRET_KEY.
 *
 * Usage:
 *   node scripts/acquisition-funnel-report.cjs --from=2026-09-04 --to=2026-09-05
 *   node scripts/acquisition-funnel-report.cjs --from=2026-09-04 --to=2026-09-05 --include-qa
 *
 * Prints event_count vs unique_sessions (tab sessionStorage — not a person).
 * QA/synthetic rows excluded by default.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function brtDayStartIso(yyyyMmDd) {
  // Interpret calendar day in America/Sao_Paulo as UTC instant via offset probe.
  // Fixed -03 is correct for BRT without DST (current BR rules).
  return `${yyyyMmDd}T00:00:00-03:00`;
}

function isSyntheticQa(row) {
  const source = String(row.utm_source || "").trim().toLowerCase();
  const campaign = String(row.utm_campaign || "").trim().toLowerCase();
  const content = String(row.utm_content || "").trim().toLowerCase();
  if (source === "qa" || source === "amem-qa" || source === "amem_qa") return true;
  const exactCampaign = new Set([
    "launch_readiness",
    "capi_final",
    "audit_final",
    "qa",
    "amem_qa",
  ]);
  const exactContent = new Set(["audit_final", "capi_final", "qa", "probe"]);
  if (exactCampaign.has(campaign) || exactContent.has(content)) return true;
  const looks = (v) =>
    v.startsWith("qa_") ||
    v.startsWith("qa-") ||
    v.includes("_qa_") ||
    v.includes("-qa-") ||
    v.startsWith("audit_") ||
    v.startsWith("capi_") ||
    v.includes("launch_readiness");
  return looks(campaign) || looks(content);
}

async function main() {
  const from = arg("from", null);
  const to = arg("to", null);
  const includeQa = hasFlag("include-qa");
  if (!from || !to) {
    console.error(
      "Usage: node scripts/acquisition-funnel-report.cjs --from=YYYY-MM-DD --to=YYYY-MM-DD [--include-qa]",
    );
    process.exit(1);
  }

  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
    process.exit(1);
  }

  const startAt = brtDayStartIso(from);
  const endAt = brtDayStartIso(to);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client
    .from("public_conversion_events")
    .select(
      "event_name,session_key,utm_source,utm_campaign,utm_content,received_at",
    )
    .gte("received_at", startAt)
    .lt("received_at", endAt)
    .limit(50000);

  if (error) {
    console.error("Query failed:", error.message || error);
    process.exit(1);
  }

  const rows = (data || []).filter((r) => includeQa || !isSyntheticQa(r));
  const excluded = (data || []).length - rows.length;

  /** @type {Map<string, { event_count: number, sessions: Set<string> }>} */
  const groups = new Map();
  for (const row of rows) {
    const keyParts = [
      row.utm_campaign || "(none)",
      row.utm_content || "(none)",
      row.event_name,
      isSyntheticQa(row) ? "qa" : "live",
    ].join("\t");
    let bucket = groups.get(keyParts);
    if (!bucket) {
      bucket = { event_count: 0, sessions: new Set() };
      groups.set(keyParts, bucket);
    }
    bucket.event_count += 1;
    if (row.session_key) bucket.sessions.add(row.session_key);
  }

  console.log(
    JSON.stringify(
      {
        window: { from_brt: from, to_brt: to, startAt, endAt },
        include_qa: includeQa,
        rows_fetched: (data || []).length,
        rows_excluded_as_qa: excluded,
        note:
          "event_count = rows after event_id dedupe; unique_sessions = distinct session_key (tab-scoped, not a person). For /comece use paid_landing_* + signup_started only — do not mix organic landing_* into the same stage.",
        groups: [...groups.entries()]
          .map(([k, v]) => {
            const [utm_campaign, utm_content, event_name, traffic] =
              k.split("\t");
            return {
              utm_campaign,
              utm_content,
              event_name,
              traffic,
              event_count: v.event_count,
              unique_sessions: v.sessions.size,
            };
          })
          .sort((a, b) =>
            `${a.traffic}${a.utm_campaign}${a.utm_content}${a.event_name}`.localeCompare(
              `${b.traffic}${b.utm_campaign}${b.utm_content}${b.event_name}`,
            ),
          ),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
