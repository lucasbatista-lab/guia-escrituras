import { describe, expect, it } from "vitest";
import {
  evaluateDailyBurst,
  evaluateMonthlyBudget,
  getBudgetConfig,
} from "@/lib/usage";

describe("monthly budget", () => {
  const config = getBudgetConfig("caminho");

  it("is normal below 70%", () => {
    const status = evaluateMonthlyBudget({
      usedBrlCents: Math.floor(config.monthlyBudgetBrlCents * 0.5),
      config,
    });
    expect(status.level).toBe("normal");
    expect(status.blocked).toBe(false);
    expect(status.alertsTriggered).toEqual([]);
  });

  it("triggers 70% and 90% alerts", () => {
    const elevated = evaluateMonthlyBudget({
      usedBrlCents: Math.floor(config.monthlyBudgetBrlCents * 0.75),
      config,
    });
    expect(elevated.level).toBe("elevated");
    expect(elevated.alertsTriggered).toContain(0.7);

    const near = evaluateMonthlyBudget({
      usedBrlCents: Math.floor(config.monthlyBudgetBrlCents * 0.95),
      config,
    });
    expect(near.level).toBe("near_limit");
    expect(near.alertsTriggered).toEqual(expect.arrayContaining([0.7, 0.9]));
  });

  it("blocks at 100%", () => {
    const status = evaluateMonthlyBudget({
      usedBrlCents: config.monthlyBudgetBrlCents,
      config,
    });
    expect(status.level).toBe("blocked");
    expect(status.blocked).toBe(true);
    expect(status.alertsTriggered).toContain(1.0);
  });

  it("blocks when abuse flagged", () => {
    const status = evaluateMonthlyBudget({
      usedBrlCents: 0,
      config,
      abuseFlagged: true,
    });
    expect(status.blocked).toBe(true);
    expect(status.level).toBe("blocked");
  });
});

describe("daily burst limit", () => {
  it("allows under the limit", () => {
    const status = evaluateDailyBurst({
      requestsToday: 10,
      dailyBurstLimit: 80,
    });
    expect(status.blocked).toBe(false);
    expect(status.remaining).toBe(70);
  });

  it("blocks at the limit", () => {
    const status = evaluateDailyBurst({
      requestsToday: 80,
      dailyBurstLimit: 80,
    });
    expect(status.blocked).toBe(true);
    expect(status.remaining).toBe(0);
  });
});
