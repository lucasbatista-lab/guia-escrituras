import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addCalendarDays,
  brtCalendarDate,
  compareCalendarDates,
  isFutureCalendarDate,
  isIsoCalendarDate,
  isPastCalendarDate,
  isTodayInSaoPaulo,
  isWritableDailyInteractionDate,
  listRecentCalendarDates,
  PRODUCT_TIMEZONE,
} from "@/lib/daily";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("BRT calendar source of truth", () => {
  it("uses America/Sao_Paulo only", () => {
    expect(PRODUCT_TIMEZONE).toBe("America/Sao_Paulo");
  });

  it("keeps BRT date before UTC midnight crossover (20:59 BRT / 23:59 UTC)", () => {
    // 2026-03-15 23:59 UTC = 2026-03-15 20:59 BRT (UTC-3)
    expect(brtCalendarDate(new Date("2026-03-15T23:59:00.000Z"))).toBe(
      "2026-03-15",
    );
  });

  it("keeps BRT previous day after UTC day rolls (21:01 BRT still previous)", () => {
    // 2026-03-16 00:01 UTC = 2026-03-15 21:01 BRT
    expect(brtCalendarDate(new Date("2026-03-16T00:01:00.000Z"))).toBe(
      "2026-03-15",
    );
  });

  it("turns over exactly at midnight BRT", () => {
    expect(brtCalendarDate(new Date("2026-09-21T02:59:59.000Z"))).toBe(
      "2026-09-20",
    );
    expect(brtCalendarDate(new Date("2026-09-21T03:00:00.000Z"))).toBe(
      "2026-09-21",
    );
  });

  it("handles month and year boundaries in BRT", () => {
    // 2026-10-01 02:59 UTC = 2026-09-30 23:59 BRT
    expect(brtCalendarDate(new Date("2026-10-01T02:59:59.000Z"))).toBe(
      "2026-09-30",
    );
    expect(brtCalendarDate(new Date("2026-10-01T03:00:00.000Z"))).toBe(
      "2026-10-01",
    );
    // New Year: 2027-01-01 02:59 UTC = 2026-12-31 23:59 BRT
    expect(brtCalendarDate(new Date("2027-01-01T02:59:59.000Z"))).toBe(
      "2026-12-31",
    );
    expect(brtCalendarDate(new Date("2027-01-01T03:00:00.000Z"))).toBe(
      "2027-01-01",
    );
  });

  it("validates leap days and rejects impossible dates", () => {
    expect(isIsoCalendarDate("2024-02-29")).toBe(true);
    expect(isIsoCalendarDate("2025-02-29")).toBe(false);
    expect(isIsoCalendarDate("2026-02-31")).toBe(false);
    expect(isIsoCalendarDate("2026-13-01")).toBe(false);
    expect(isIsoCalendarDate("2026-09-20T12:00:00Z")).toBe(false);
    expect(isIsoCalendarDate("20/09/2026")).toBe(false);
  });
});

describe("writable daily interaction date guard", () => {
  const frozen = new Date("2026-09-21T15:00:00.000Z"); // 12:00 BRT on 2026-09-21

  it("accepts only product today", () => {
    expect(isWritableDailyInteractionDate("2026-09-21", frozen)).toBe(true);
    expect(isTodayInSaoPaulo("2026-09-21", frozen)).toBe(true);
  });

  it("rejects yesterday and tomorrow", () => {
    expect(isWritableDailyInteractionDate("2026-09-20", frozen)).toBe(false);
    expect(isWritableDailyInteractionDate("2026-09-22", frozen)).toBe(false);
    expect(isPastCalendarDate("2026-09-20", frozen)).toBe(true);
    expect(isFutureCalendarDate("2026-09-22", frozen)).toBe(true);
  });

  it("rejects invalid calendar strings", () => {
    expect(isWritableDailyInteractionDate("2026-02-31", frozen)).toBe(false);
    expect(isWritableDailyInteractionDate("not-a-date", frozen)).toBe(false);
  });

  it("API route enforces date_not_today server-side", () => {
    const route = read("src", "app", "api", "daily", "interaction", "route.ts");
    expect(route).toContain("isWritableDailyInteractionDate");
    expect(route).toContain("date_not_today");
    expect(route).toContain("status: 400");
  });
});

describe("history rail calendar contracts", () => {
  it("lists 7 civil days ending at today, newest first, no future", () => {
    const dates = listRecentCalendarDates("2026-03-01", 7);
    expect(dates).toEqual([
      "2026-03-01",
      "2026-02-28",
      "2026-02-27",
      "2026-02-26",
      "2026-02-25",
      "2026-02-24",
      "2026-02-23",
    ]);
    expect(dates.every((d) => compareCalendarDates(d, "2026-03-01") <= 0)).toBe(
      true,
    );
  });

  it("history strip links today to /hoje and past to ?dia=", () => {
    const strip = read("src", "components", "daily", "daily-history.tsx");
    expect(strip).toContain('isToday ? "/hoje" : `/hoje?dia=${item.date}`');
    expect(strip).toContain("feito");
    expect(strip).toContain("sem cobrança");
  });

  it("home section never revisits future or today via query", () => {
    const section = read(
      "src",
      "components",
      "daily",
      "daily-home-section.tsx",
    );
    expect(section).toContain("isPastCalendarDate");
    expect(section).toContain("HojeRevisit");
    expect(section).toContain("HojeRitual");
    expect(section).toContain("listRecentCalendarDates(today, 7)");
  });
});

describe("URL architecture contracts", () => {
  it("/hoje is interactive today; ?dia= is authenticated revisit", () => {
    const page = read("src", "app", "(platform)", "hoje", "page.tsx");
    expect(page).toContain("revisitDate");
    expect(page).toContain("params.dia");
    expect(page).toContain("DailyHomeSection");
    expect(page).toMatch(/interactive ritual|read-only revisit/i);
  });

  it("/hoje/[date] is public share with no private mutation surface", () => {
    const share = read("src", "app", "(marketing)", "hoje", "[date]", "page.tsx");
    expect(share).toContain("publicDailyShareFields");
    expect(share).toContain("isFutureCalendarDate");
    expect(share).toContain("notFound");
    expect(share).not.toContain("/api/daily/interaction");
    expect(share).not.toContain("upsertDailyInteraction");
    expect(share).not.toContain("userId");
    expect(share).not.toContain("getAuthUserContext");
  });

  it("share helpers point at /hoje/[date] permalink", () => {
    const share = read("src", "lib", "daily", "share.ts");
    expect(share).toContain("`/hoje/${isoDate}`");
  });
});

describe("HojeRevisit read-only", () => {
  it("never posts interactions or product completion events", () => {
    const revisit = read("src", "components", "daily", "hoje-revisit.tsx");
    expect(revisit).toContain('data-hoje-phase="revisit"');
    expect(revisit).not.toContain("/api/daily/interaction");
    expect(revisit).not.toContain("persistProductEvent");
    expect(revisit).not.toContain("daily_completed");
    expect(revisit).not.toContain("openai");
    expect(revisit).toContain('href="/hoje"');
  });
});

describe("interaction upsert monotonicity", () => {
  it("preserves completed/saved/shared once set", () => {
    const interactions = read("src", "lib", "daily", "interactions.ts");
    expect(interactions).toContain("existing?.completedAt ?? now");
    expect(interactions).toContain("existing?.completedAt ?? null");
    expect(interactions).toContain("existing?.savedAt ?? now");
    expect(interactions).toContain("existing?.sharedAt ?? now");
    expect(interactions).toContain('onConflict: "user_id,local_date"');
  });
});

describe("calendar arithmetic helpers", () => {
  it("addCalendarDays crosses months correctly", () => {
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addCalendarDays("2024-02-29", 1)).toBe("2024-03-01");
  });
});
