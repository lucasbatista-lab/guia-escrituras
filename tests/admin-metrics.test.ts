import { describe, expect, it, vi, afterEach } from "vitest";
import {
  formatRevenueBrl,
  maskUserId,
  aggregateUsageEventsPaginated,
} from "@/lib/admin/metrics";
import { selectEffectiveSubscriptionsByUser } from "@/lib/billing/effective-subscription";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";
import { dailyReportService } from "@/lib/reports";

describe("maskUserId", () => {
  it("masks without exposing full uuid", () => {
    const masked = maskUserId("12345678-abcd-efgh-ijkl");
    expect(masked).toBe("usr_12345678");
    expect(masked).not.toContain("abcd-efgh");
  });
});

describe("formatRevenueBrl", () => {
  it("shows null revenue as not integrated — not zero", () => {
    expect(formatRevenueBrl(null)).toBe("Ainda não integrada");
    expect(formatRevenueBrl(undefined)).toBe("Ainda não integrada");
  });

  it("formats real zero as currency", () => {
    expect(formatRevenueBrl(0)).toContain("R$");
  });
});

describe("daily report interpretation", () => {
  it("handles null revenue without showing zero as integrated", () => {
    const interpretation = dailyReportService.interpretWithRules({
      date: "2026-07-12",
      activeSubscribers: 0,
      revenueBrlCents: null,
      activeUsers: 0,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      aiCostUsdMicros: 0,
      aiCostBrlCents: 0,
      usageP50: 0,
      usageP90: 0,
      usageP99: 0,
      errorCount: 0,
      retentionD1: 0,
      retentionD7: 0,
      retentionD30: 0,
      conversionsByOrigin: [],
      partnerPerformance: [],
      anomalies: [],
    });
    expect(
      interpretation.highlights.some((h) => h.includes("Ainda não integrada")),
    ).toBe(true);
  });
});

describe("MRR deduplicated by user", () => {
  it("counts one effective subscription per user", () => {
    const { effective, usersWithDuplicates } = selectEffectiveSubscriptionsByUser([
      {
        id: "1",
        userId: "u1",
        planKey: "essencial",
        status: "active",
        stripeSubscriptionId: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        userId: "u1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_x",
        createdAt: "2026-02-01T00:00:00Z",
      },
      {
        id: "3",
        userId: "u2",
        planKey: "caminho",
        status: "active",
        stripeSubscriptionId: "sub_y",
        createdAt: "2026-02-01T00:00:00Z",
      },
    ]);
    expect(usersWithDuplicates).toBe(1);
    expect(effective).toHaveLength(2);
    const mrr = effective.reduce(
      (s, row) =>
        s + (PLAN_DEFINITIONS.find((p) => p.key === row.planKey)?.priceMonthlyCents ?? 0),
      0,
    );
    // u1 profundo + u2 caminho
    expect(mrr).toBe(18800 + 5800);
  });
});

describe("aggregateUsageEventsPaginated", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pages beyond 1000 simulated records without silent truncation under maxPages", async () => {
    const totalRows = 1200;
    const pageSize = 1000;
    let call = 0;

    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: (from: number, to: number) => {
              call += 1;
              const slice = [];
              for (let i = from; i <= to && i < totalRows; i += 1) {
                slice.push({
                  estimated_cost_brl_cents: 1,
                  estimated_cost_usd_micros: 1000,
                  success: true,
                  input_tokens: 10,
                  output_tokens: 20,
                  latency_ms: 100,
                });
              }
              return Promise.resolve({ data: slice, error: null });
            },
          }),
        }),
      }),
    };

    const result = await aggregateUsageEventsPaginated(client as never, {
      pageSize,
      maxPages: 5,
    });
    expect(result.requests).toBe(1200);
    expect(result.costBrlCents).toBe(1200);
    expect(result.partial).toBe(false);
    expect(call).toBeGreaterThanOrEqual(2);
  });

  it("marks partial when maxPages is exhausted", async () => {
    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: () =>
              Promise.resolve({
                data: Array.from({ length: 1000 }, () => ({
                  estimated_cost_brl_cents: 1,
                  estimated_cost_usd_micros: 1,
                  success: true,
                  input_tokens: 1,
                  output_tokens: 1,
                  latency_ms: 1,
                })),
                error: null,
              }),
          }),
        }),
      }),
    };

    const result = await aggregateUsageEventsPaginated(client as never, {
      pageSize: 1000,
      maxPages: 1,
    });
    expect(result.partial).toBe(true);
    expect(result.requests).toBe(1000);
  });
});

describe("admin pages source contracts", () => {
  it("overview distinguishes MRR, revenue and estimated AI cost", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/page.tsx", "utf8"),
    );
    expect(source).toContain("MRR estimado pelo preço de catálogo");
    expect(source).toContain("Receita real recebida");
    expect(source).toContain("payment_events failed");
    expect(source).toContain("Checkout stuck");
    expect(source).not.toContain("Falhas de pagamento");
  });

  it("usuarios page has search filters and pagination links", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/usuarios/page.tsx", "utf8"),
    );
    expect(source).toContain("name=\"q\"");
    expect(source).toContain("Anterior");
    expect(source).toContain("Próxima");
    expect(source).toContain("/admin/usuarios/");
  });

  it("user detail does not expose raw Stripe column names or message bodies", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/usuarios/[userId]/page.tsx", "utf8"),
    );
    expect(source).toContain("getAdminUserDetail");
    expect(source).toContain("stripeCustomerIdMasked");
    expect(source).not.toContain("stripe_customer_id");
    expect(source).not.toContain("stripe_subscription_id");
    expect(source).not.toContain("messages");
  });

  it("relatorios empty state is honest", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/relatorios/page.tsx", "utf8"),
    );
    expect(source).toContain("Nenhum daily_report armazenado ainda");
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain("DailyReportGeneratePanel");
  });

  it("admin layout requires isAdmin without demo fallback", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/layout.tsx", "utf8"),
    );
    expect(source).not.toContain("demoMode");
    expect(source).toContain("isAdmin");
  });
});

describe("payment event states are distinct concepts", () => {
  it("overview metrics type includes separate fields", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/admin/metrics.ts", "utf8"),
    );
    expect(source).toContain("paymentEventsReceived");
    expect(source).toContain("paymentEventsFailed");
    expect(source).toContain("paymentEventsProcessed");
    expect(source).toContain("pastDueSubscriptions");
    expect(source).toContain("checkoutsStuckOver30m");
    expect(source).toContain("realRevenueBrlCents: null");
    expect(source).toContain("newUsersToday");
  });
});
