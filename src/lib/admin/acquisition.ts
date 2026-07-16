import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCampaignSignal } from "@/lib/acquisition/sanitize";
import {
  ADMIN_QUERY_MAX_PAGES,
  ADMIN_QUERY_PAGE_SIZE,
  fetchAllRowsPaginated,
} from "./paginate";
import { AdminMetricsError } from "./metrics";
import { assertAdminServiceAccess } from "./require-admin";

export type AcquisitionPeriodDays = 7 | 30 | 90;

export interface AcquisitionBreakdownRow {
  key: string;
  signups: number;
  checkoutsStarted: number;
  subscriptions: number;
  conversionPct: number | null;
  byPlan: Partial<Record<PlanKey, number>>;
}

export interface AcquisitionReport {
  periodDays: AcquisitionPeriodDays;
  sinceIso: string;
  generatedAt: string;
  partial: boolean;
  totalSignups: number;
  attributedSignups: number;
  unattributedSignups: number;
  checkoutsStarted: number;
  subscriptions: number;
  attributedConversionPct: number | null;
  referralSignups: number;
  referralSubscriptions: number;
  /** Cadastros com utm_source=share (compartilhamento/indicação orgânica). */
  shareSignups: number;
  /** Assinaturas completed originadas por share. */
  shareSubscriptions: number;
  /** Referrals (ref) sem assinatura completed no período. */
  referralWithoutSubscription: number;
  bySource: AcquisitionBreakdownRow[];
  byCampaign: AcquisitionBreakdownRow[];
  byContent: AcquisitionBreakdownRow[];
  /** Breakdown de utm_content apenas para utm_source=share. */
  byShareContent: AcquisitionBreakdownRow[];
}

type IntentRow = {
  status: string;
  selected_plan_key: string;
  referral_code: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_medium: string | null;
  utm_term: string | null;
  created_at: string;
};

function admin() {
  try {
    return createAdminClient();
  } catch {
    throw new AdminMetricsError(
      "Métricas indisponíveis: configure SUPABASE_SECRET_KEY.",
    );
  }
}

function isAttributed(row: IntentRow): boolean {
  return hasCampaignSignal({
    referralCode: row.referral_code,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    utmTerm: row.utm_term,
  });
}

function emptyBreakdown(key: string): AcquisitionBreakdownRow {
  return {
    key,
    signups: 0,
    checkoutsStarted: 0,
    subscriptions: 0,
    conversionPct: null,
    byPlan: {},
  };
}

function bump(
  map: Map<string, AcquisitionBreakdownRow>,
  key: string,
  row: IntentRow,
) {
  const label = key.trim() || "(vazio)";
  const current = map.get(label) ?? emptyBreakdown(label);
  current.signups += 1;
  if (
    row.status === "checkout_created" ||
    row.status === "completed"
  ) {
    current.checkoutsStarted += 1;
  }
  if (row.status === "completed") {
    current.subscriptions += 1;
    const plan = row.selected_plan_key as PlanKey;
    current.byPlan[plan] = (current.byPlan[plan] ?? 0) + 1;
  }
  map.set(label, current);
}

function finalizeRows(
  map: Map<string, AcquisitionBreakdownRow>,
): AcquisitionBreakdownRow[] {
  return [...map.values()]
    .map((row) => ({
      ...row,
      conversionPct:
        row.signups > 0
          ? Math.round((row.subscriptions / row.signups) * 1000) / 10
          : null,
    }))
    .sort((a, b) => b.signups - a.signups || a.key.localeCompare(b.key));
}

export async function getAdminAcquisitionReport(
  periodDays: AcquisitionPeriodDays = 30,
): Promise<AcquisitionReport> {
  await assertAdminServiceAccess();
  const client = admin();
  const generatedAt = new Date().toISOString();
  const sinceIso = new Date(
    Date.now() - periodDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { rows, partial } = await fetchAllRowsPaginated<IntentRow>(
    (from, to) =>
      client
        .from("signup_intents")
        .select(
          "status, selected_plan_key, referral_code, utm_source, utm_campaign, utm_content, utm_medium, utm_term, created_at",
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { pageSize: ADMIN_QUERY_PAGE_SIZE, maxPages: ADMIN_QUERY_MAX_PAGES },
  );

  const bySource = new Map<string, AcquisitionBreakdownRow>();
  const byCampaign = new Map<string, AcquisitionBreakdownRow>();
  const byContent = new Map<string, AcquisitionBreakdownRow>();
  const byShareContent = new Map<string, AcquisitionBreakdownRow>();

  let totalSignups = 0;
  let attributedSignups = 0;
  let unattributedSignups = 0;
  let checkoutsStarted = 0;
  let subscriptions = 0;
  let attributedSubscriptions = 0;
  let referralSignups = 0;
  let referralSubscriptions = 0;
  let shareSignups = 0;
  let shareSubscriptions = 0;
  let referralWithoutSubscription = 0;

  for (const row of rows) {
    totalSignups += 1;
    const attributed = isAttributed(row);
    if (attributed) attributedSignups += 1;
    else unattributedSignups += 1;

    if (
      row.status === "checkout_created" ||
      row.status === "completed"
    ) {
      checkoutsStarted += 1;
    }
    if (row.status === "completed") {
      subscriptions += 1;
      if (attributed) attributedSubscriptions += 1;
    }
    if (row.referral_code?.trim()) {
      referralSignups += 1;
      if (row.status === "completed") referralSubscriptions += 1;
      else referralWithoutSubscription += 1;
    }

    const isShare = (row.utm_source ?? "").trim().toLowerCase() === "share";
    if (isShare) {
      shareSignups += 1;
      if (row.status === "completed") shareSubscriptions += 1;
      bump(byShareContent, row.utm_content ?? "(sem content)", row);
    }

    if (attributed) {
      bump(bySource, row.utm_source ?? "(sem source)", row);
      bump(byCampaign, row.utm_campaign ?? "(sem campaign)", row);
      bump(byContent, row.utm_content ?? "(sem content)", row);
    }
  }

  return {
    periodDays,
    sinceIso,
    generatedAt,
    partial,
    totalSignups,
    attributedSignups,
    unattributedSignups,
    checkoutsStarted,
    subscriptions,
    attributedConversionPct:
      attributedSignups > 0
        ? Math.round((attributedSubscriptions / attributedSignups) * 1000) / 10
        : null,
    referralSignups,
    referralSubscriptions,
    shareSignups,
    shareSubscriptions,
    referralWithoutSubscription,
    bySource: finalizeRows(bySource),
    byCampaign: finalizeRows(byCampaign),
    byContent: finalizeRows(byContent),
    byShareContent: finalizeRows(byShareContent),
  };
}

export function parseAcquisitionPeriod(
  raw: string | undefined,
): AcquisitionPeriodDays {
  if (raw === "7" || raw === "90") return Number(raw) as AcquisitionPeriodDays;
  return 30;
}
