import { describe, expect, it } from "vitest";
import {
  formatRevenueBrl,
  maskUserId,
} from "@/lib/admin/metrics";
import { dailyReportService } from "@/lib/reports";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";

describe("maskUserId", () => {
  it("masks without exposing full uuid", () => {
    const masked = maskUserId("12345678-abcd-efgh-ijkl");
    expect(masked).toBe("usr_12345678");
    expect(masked).not.toContain("abcd-efgh");
  });
});

describe("formatRevenueBrl", () => {
  it("shows null revenue as not integrated", () => {
    expect(formatRevenueBrl(null)).toBe("Ainda não integrada");
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
    expect(interpretation.highlights.some((h) => h.includes("Ainda não integrada"))).toBe(
      true,
    );
  });
});

describe("MRR from plan catalog", () => {
  it("calculates MRR from active subscriptions count and catalog prices", () => {
    const essencial = PLAN_DEFINITIONS.find((p) => p.key === "essencial");
    const caminho = PLAN_DEFINITIONS.find((p) => p.key === "caminho");
    const mrr =
      2 * (essencial?.priceMonthlyCents ?? 0) +
      1 * (caminho?.priceMonthlyCents ?? 0);
    expect(mrr).toBe(2 * 3800 + 5800);
  });
});

describe("admin authorization policy", () => {
  it("admin layout requires isAdmin without demo fallback", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/layout.tsx", "utf8"),
    );
    expect(source).not.toContain("demoMode");
    expect(source).not.toContain("MOCK_ADMIN_METRICS");
    expect(source).toContain("isAdmin");
  });
});

describe("no mock admin metrics export", () => {
  it("database index does not export MOCK_ADMIN_METRICS", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/database/index.ts", "utf8"),
    );
    expect(source).not.toContain("MOCK_ADMIN_METRICS");
  });
});
