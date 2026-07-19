import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanKey } from "@/lib/entitlements";
import { getPlanByKey } from "@/lib/entitlements";
import {
  selectEffectiveSubscriptionsByUser,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";
import { utcDayBounds } from "@/lib/reports/dates";
import type { DailyReportAggregates } from "@/lib/reports/daily-report";
import { normalizeDailyReportAggregates } from "@/lib/reports/daily-report";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

/**
 * Enrich SQL core aggregates with additional real-table metrics for the UTC day.
 * Never invents Stripe cash revenue or chat HTTP failure codes.
 */
export async function enrichDailyReportAggregates(
  client: SupabaseClient,
  sqlRaw: Partial<DailyReportAggregates> & { date: string },
): Promise<DailyReportAggregates> {
  const base = normalizeDailyReportAggregates(sqlRaw);
  const { startIso, endIso } = utcDayBounds(base.date);
  const notes: string[] = [
    "revenueBrlCents permanece null — receita em dinheiro Stripe ainda não integrada.",
    "activeSubscribers é snapshot no momento da geração, não histórico do dia.",
    "Códigos HTTP do chat (409/429/503) existem só em logs — não entram neste relatório.",
  ];

  const [
    newUsers,
    totalUsers,
    newSubscriptions,
    trialing,
    pastDue,
    canceled,
    checkoutsOpened,
    checkoutsCompleted,
    standardRequests,
    deepRequests,
    conversationsStarted,
    onboardingCompleted,
    referralsAttributed,
    paymentFailed,
    paymentProcessed,
    usageRows,
    liveSubs,
    originRows,
    partnerRows,
  ] = await Promise.all([
    client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client.from("profiles").select("id", { count: "exact", head: true }),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing"),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
    client
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled"),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .in("status", ["checkout_created", "completed"])
      .gte("checkout_created_at", startIso)
      .lt("checkout_created_at", endIso),
    client
      .from("signup_intents")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("updated_at", startIso)
      .lt("updated_at", endIso),
    client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("feature_type", "chat_standard")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("feature_type", "chat_deep")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("spiritual_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .gte("updated_at", startIso)
      .lt("updated_at", endIso),
    client
      .from("referral_attributions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "failed")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "processed")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    client
      .from("usage_events")
      .select("user_id, latency_ms")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(5000),
    client
      .from("subscriptions")
      .select(
        "id, user_id, plan_key, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at",
      )
      .in("status", ["active", "trialing"])
      .limit(5000),
    client
      .from("signup_intents")
      .select("utm_source, utm_medium, status")
      .eq("status", "completed")
      .gte("updated_at", startIso)
      .lt("updated_at", endIso)
      .limit(2000),
    client
      .from("referral_attributions")
      .select("referrer_user_id, status")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(2000),
  ]);

  // Per-user request percentiles for the day (capped sample).
  const byUser = new Map<string, number>();
  let latencySum = 0;
  let latencySamples = 0;
  for (const row of usageRows.data ?? []) {
    const uid = row.user_id as string;
    byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
    const lat = row.latency_ms as number | null;
    if (typeof lat === "number" && Number.isFinite(lat)) {
      latencySum += lat;
      latencySamples += 1;
    }
  }
  const counts = [...byUser.values()].sort((a, b) => a - b);
  if ((usageRows.data?.length ?? 0) >= 5000) {
    notes.push(
      "Percentis de uso do dia usam amostra limitada (5000 eventos) — podem ser parciais.",
    );
  }

  const candidates: SubscriptionCandidate[] = (liveSubs.data ?? []).map(
    (row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      planKey: row.plan_key as PlanKey,
      status: row.status as string,
      stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
      stripeSubscriptionId:
        (row.stripe_subscription_id as string | null) ?? null,
      currentPeriodEnd: (row.current_period_end as string | null) ?? null,
      createdAt: row.created_at as string,
    }),
  );
  const { effective } = selectEffectiveSubscriptionsByUser(candidates);
  let catalogMrr = 0;
  for (const row of effective) {
    catalogMrr += getPlanByKey(row.planKey)?.priceMonthlyCents ?? 0;
  }

  const originCounts = new Map<string, number>();
  for (const row of originRows.data ?? []) {
    const source =
      ((row.utm_source as string | null) ?? "").trim() || "(sem source)";
    originCounts.set(source, (originCounts.get(source) ?? 0) + 1);
  }
  const conversionsByOrigin = [...originCounts.entries()]
    .map(([origin, count]) => ({ origin, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Partner codes are not on attributions directly — count by referrer bucket only
  // without exposing user ids (aggregate anonymized).
  const partnerPerformance: DailyReportAggregates["partnerPerformance"] = [];
  if ((partnerRows.data?.length ?? 0) > 0) {
    partnerPerformance.push({
      partnerCode: "(referrals_do_dia)",
      attributions: partnerRows.data?.length ?? 0,
      conversions: (partnerRows.data ?? []).filter(
        (r) =>
          r.status === "first_payment_confirmed" ||
          r.status === "second_payment_confirmed",
      ).length,
    });
  }

  return {
    ...base,
    usageP50: percentile(counts, 50),
    usageP90: percentile(counts, 90),
    usageP99: percentile(counts, 99),
    conversionsByOrigin,
    partnerPerformance,
    newUsers: newUsers.count ?? 0,
    totalUsers: totalUsers.count ?? 0,
    newSubscriptions: newSubscriptions.count ?? 0,
    trialingSubscriptions: trialing.count ?? 0,
    pastDueSubscriptions: pastDue.count ?? 0,
    canceledSubscriptions: canceled.count ?? 0,
    checkoutsOpened: checkoutsOpened.count ?? 0,
    checkoutsCompleted: checkoutsCompleted.count ?? 0,
    standardRequests: standardRequests.count ?? 0,
    deepRequests: deepRequests.count ?? 0,
    conversationsStarted: conversationsStarted.count ?? 0,
    onboardingCompleted: onboardingCompleted.count ?? 0,
    referralsAttributed: referralsAttributed.count ?? 0,
    avgLatencyMs:
      latencySamples > 0 ? Math.round(latencySum / latencySamples) : null,
    catalogMrrBrlCents: catalogMrr,
    paymentEventsFailed: paymentFailed.count ?? 0,
    paymentEventsProcessed: paymentProcessed.count ?? 0,
    metricNotes: notes,
  };
}
