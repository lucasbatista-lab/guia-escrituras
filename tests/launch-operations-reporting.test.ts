import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppError } from "@/lib/safety";
import {
  assertCronAuthorized,
  enumerateUtcDatesInclusive,
  formatUtcDate,
  isFutureUtcDate,
  parseReportDate,
  yesterdayUtcDate,
  DAILY_REPORT_BACKFILL_MAX_DAYS,
  dailyReportService,
  normalizeDailyReportAggregates,
} from "@/lib/reports";
import {
  ALERT_AI_COST_DAY_BRL_CENTS,
  ALERT_MIN_SUBSCRIBERS_FOR_ACTIVITY,
  buildOperationalAlerts,
} from "@/lib/admin/operational-alerts";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const root = process.cwd();

describe("daily report dates (UTC)", () => {
  it("computes yesterday deterministically from a fixed clock", () => {
    const now = new Date("2026-07-19T00:10:00.000Z");
    expect(yesterdayUtcDate(now)).toBe("2026-07-18");
    expect(formatUtcDate(now)).toBe("2026-07-19");
  });

  it("rejects invalid and future dates", () => {
    expect(parseReportDate("2026-13-01")).toBeNull();
    expect(parseReportDate("nope")).toBeNull();
    const now = new Date("2026-07-19T12:00:00.000Z");
    expect(isFutureUtcDate("2026-07-20", now)).toBe(true);
    expect(isFutureUtcDate("2026-07-18", now)).toBe(false);
  });

  it("enumerates inclusive ranges and caps backfill", () => {
    const ok = enumerateUtcDatesInclusive("2026-07-01", "2026-07-03");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.dates).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);

    const tooBig = enumerateUtcDatesInclusive(
      "2026-01-01",
      "2026-03-01",
      DAILY_REPORT_BACKFILL_MAX_DAYS,
    );
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.code).toBe("range_too_large");
  });
});

describe("cron auth", () => {
  const env = { CRON_SECRET: "test-cron-secret-value" } as NodeJS.ProcessEnv;

  it("rejects missing secret configuration", () => {
    expect(() =>
      assertCronAuthorized(new Request("http://localhost/api/cron/daily-report"), {
        CRON_SECRET: "",
      } as NodeJS.ProcessEnv),
    ).toThrow(AppError);
  });

  it("rejects missing or wrong bearer", () => {
    expect(() =>
      assertCronAuthorized(
        new Request("http://localhost/api/cron/daily-report"),
        env,
      ),
    ).toThrow(/cron_unauthorized/);
    expect(() =>
      assertCronAuthorized(
        new Request("http://localhost/api/cron/daily-report", {
          headers: { Authorization: "Bearer wrong" },
        }),
        env,
      ),
    ).toThrow(/cron_unauthorized/);
  });

  it("accepts correct bearer and x-cron-secret", () => {
    expect(() =>
      assertCronAuthorized(
        new Request("http://localhost/api/cron/daily-report", {
          headers: { Authorization: "Bearer test-cron-secret-value" },
        }),
        env,
      ),
    ).not.toThrow();
    expect(() =>
      assertCronAuthorized(
        new Request("http://localhost/api/cron/daily-report", {
          headers: { "x-cron-secret": "test-cron-secret-value" },
        }),
        env,
      ),
    ).not.toThrow();
  });
});

describe("daily report interpretation honesty", () => {
  it("keeps null revenue and notes chat failure limitation", () => {
    const agg = normalizeDailyReportAggregates({
      date: "2026-07-18",
      activeSubscribers: 12,
      revenueBrlCents: null,
      activeUsers: 4,
      totalRequests: 10,
      totalInputTokens: 100,
      totalOutputTokens: 200,
      aiCostUsdMicros: 1,
      aiCostBrlCents: 50,
      standardRequests: 8,
      deepRequests: 2,
      catalogMrrBrlCents: 5800,
    });
    const interpretation = dailyReportService.interpretWithRules(agg);
    expect(interpretation.highlights.join(" ")).toMatch(/Ainda não integrada/i);
    expect(interpretation.highlights.join(" ")).toMatch(/Profundo/);
    expect(interpretation.recommendations.join(" ")).toMatch(/409\/429\/503/);
    expect(JSON.stringify(agg)).not.toMatch(/sk-|Bearer |password/i);
  });
});

describe("operational alerts", () => {
  const base = {
    paymentEventsReceivedStuck: 0,
    paymentEventsFailed: 0,
    pastDueSubscriptions: 0,
    checkoutsStuckOver30m: 0,
    usersWithDuplicateSubscriptions: 0,
    cancelingWithAccessCount: 0,
    yesterdayReportPresent: true,
    yesterdayReportDate: "2026-07-18",
    activeSubscriberUsers: 2,
    aiRequestsToday: 3,
    aiEstimatedCostBrlCentsToday: 100,
  };

  it("alerts when yesterday report is missing", () => {
    const alerts = buildOperationalAlerts({
      ...base,
      yesterdayReportPresent: false,
    });
    expect(alerts.some((a) => a.key === "daily_report_missing")).toBe(true);
  });

  it("does not false-positive no-activity with few subscribers", () => {
    const alerts = buildOperationalAlerts({
      ...base,
      activeSubscriberUsers: ALERT_MIN_SUBSCRIBERS_FOR_ACTIVITY - 1,
      aiRequestsToday: 0,
    });
    expect(alerts.some((a) => a.key === "no_ai_activity")).toBe(false);
  });

  it("flags past_due and high planning cost", () => {
    const alerts = buildOperationalAlerts({
      ...base,
      pastDueSubscriptions: 2,
      aiEstimatedCostBrlCentsToday: ALERT_AI_COST_DAY_BRL_CENTS,
      activeSubscriberUsers: ALERT_MIN_SUBSCRIBERS_FOR_ACTIVITY,
      aiRequestsToday: 0,
    });
    expect(alerts.some((a) => a.key === "past_due")).toBe(true);
    expect(alerts.some((a) => a.key === "ai_cost_day")).toBe(true);
    expect(alerts.some((a) => a.key === "no_ai_activity")).toBe(true);
  });

  it("stays quiet when report present and healthy", () => {
    expect(buildOperationalAlerts(base)).toEqual([]);
  });

  it("surfaces canceling-with-access as an attention shortcut", () => {
    const alerts = buildOperationalAlerts({
      ...base,
      cancelingWithAccessCount: 3,
    });
    const alert = alerts.find((a) => a.key === "canceling_with_access");
    expect(alert).toBeTruthy();
    expect(alert?.href).toBe("/admin/usuarios?canceling=1");
    expect(alert?.level).toBe("info");
  });
});

describe("generateDailyReportForDate outcomes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("fails closed on future dates without calling supabase", async () => {
    const { generateDailyReportForDate } = await import("@/lib/reports/generate");
    const result = await generateDailyReportForDate("2099-01-01", {
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    expect(result.outcome).toBe("failed");
    expect(result.errorCode).toBe("future_date");
  });

  it("upserts idempotently for the same day", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          report_date: "2026-07-17",
          aggregates: {
            date: "2026-07-17",
            totalRequests: 1,
            aiCostBrlCents: 10,
            activeUsers: 1,
            errorCount: 0,
            newUsers: 0,
            deepRequests: 0,
          },
        },
      });

    const from = vi.fn((table: string) => {
      if (table === "daily_reports") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle }),
          }),
          upsert,
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {
        select: () => ({
          count: "exact",
          head: true,
          gte: () => ({ lt: () => Promise.resolve({ count: 0 }) }),
          eq: () => ({
            gte: () => ({ lt: () => Promise.resolve({ count: 0 }) }),
            count: 0,
          }),
          in: () => ({
            gte: () => ({ lt: () => Promise.resolve({ count: 0 }) }),
            limit: () => Promise.resolve({ data: [] }),
          }),
          limit: () => Promise.resolve({ data: [] }),
        }),
      };
    });

    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from,
        rpc: vi.fn().mockResolvedValue({
          data: {
            date: "2026-07-17",
            activeSubscribers: 1,
            revenueBrlCents: null,
            activeUsers: 1,
            totalRequests: 1,
            totalInputTokens: 1,
            totalOutputTokens: 1,
            aiCostUsdMicros: 1,
            aiCostBrlCents: 10,
            errorCount: 0,
          },
          error: null,
        }),
      }),
    }));

    vi.doMock("@/lib/reports/enrich", () => ({
      enrichDailyReportAggregates: async (
        _c: unknown,
        raw: { date: string },
      ) =>
        normalizeDailyReportAggregates({
          date: raw.date,
          activeSubscribers: 1,
          revenueBrlCents: null,
          activeUsers: 1,
          totalRequests: 1,
          totalInputTokens: 1,
          totalOutputTokens: 1,
          aiCostUsdMicros: 1,
          aiCostBrlCents: 10,
          errorCount: 0,
          newUsers: 0,
          deepRequests: 0,
        }),
    }));

    const { generateDailyReportForDate } = await import("@/lib/reports/generate");
    const first = await generateDailyReportForDate("2026-07-17", {
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    expect(first.outcome).toBe("created");
    expect(upsert).toHaveBeenCalled();

    const second = await generateDailyReportForDate("2026-07-17", {
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    expect(["unchanged", "updated"]).toContain(second.outcome);
  });
});

describe("cron route surface", () => {
  it("does not expose secrets and is covered by /api robots disallow", () => {
    const src = readFileSync(
      join(root, "src", "app", "api", "cron", "daily-report", "route.ts"),
      "utf8",
    );
    expect(src).toContain("assertCronAuthorized");
    expect(src).not.toContain("CRON_SECRET}");
    expect(src).toContain('outcome');
    expect(src).not.toContain("stack");

    const original = snapshotEnv();
    try {
      process.env.VERCEL_ENV = "production";
      process.env.NODE_ENV = "production";
      const doc = robots();
      const rule = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules;
      expect(rule?.disallow).toEqual(expect.arrayContaining(["/api", "/admin"]));
    } finally {
      restoreEnv(original);
    }

    const urls = sitemap().map((e) => e.url).join(" ");
    expect(urls).not.toContain("/api/cron");
    expect(urls).not.toContain("/admin");
  });

  it("documents vercel cron schedule and CRON_SECRET name only", () => {
    const vercel = JSON.parse(
      readFileSync(join(root, "vercel.json"), "utf8"),
    ) as { crons: Array<{ path: string; schedule: string }> };
    expect(vercel.crons[0]?.path).toBe("/api/cron/daily-report");
    expect(vercel.crons[0]?.schedule).toBe("15 0 * * *");
    const envExample = readFileSync(join(root, ".env.example"), "utf8");
    expect(envExample).toContain("CRON_SECRET=");
    expect(envExample).not.toMatch(/CRON_SECRET=\S+/);
  });
});
