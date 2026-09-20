import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOTTOM_NAV_FREE,
  BOTTOM_NAV_PAID,
  getBottomNavPlan,
  getBottomNavTabs,
  getPlatformNavItemsForState,
  isBottomNavTabActive,
  journeyAllowsChat,
  type UserJourneyState,
} from "@/lib/journey";
import { PRIVATE_PLATFORM_PREFIXES } from "@/lib/edge/private-paths";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W2 FREE/PAID navigation models", () => {
  it("FREE bottom tabs are Início · Hoje · Espaço · Caminhos", () => {
    expect(BOTTOM_NAV_FREE.map((t) => t.label)).toEqual([
      "Início",
      "Hoje",
      "Espaço",
      "Caminhos",
    ]);
    expect(BOTTOM_NAV_FREE.map((t) => t.href)).toEqual([
      "/inicio",
      "/hoje",
      "/espaco",
      "/jornadas",
    ]);
    expect(getBottomNavPlan("confirmed_without_plan")).toBe("free");
    expect(getBottomNavPlan("ended")).toBe("free");
    expect(getBottomNavPlan("past_due")).toBe("free");
  });

  it("PAID bottom tabs are Início · Hoje · Conversar · Caminhos", () => {
    expect(BOTTOM_NAV_PAID.map((t) => t.label)).toEqual([
      "Início",
      "Hoje",
      "Conversar",
      "Caminhos",
    ]);
    expect(BOTTOM_NAV_PAID.map((t) => t.href)).toEqual([
      "/inicio",
      "/hoje",
      "/conversar",
      "/jornadas",
    ]);
    expect(getBottomNavPlan("active_ready")).toBe("paid");
    expect(getBottomNavPlan("canceling_at_period_end")).toBe("paid");
    expect(getBottomNavPlan("active_needs_personalization")).toBe("paid");
  });

  it("slot 3 morphs Espaço → Conversar with stable id", () => {
    const freeSlot = getBottomNavTabs("free").find((t) => t.id === "slot3");
    const paidSlot = getBottomNavTabs("paid").find((t) => t.id === "slot3");
    expect(freeSlot?.href).toBe("/espaco");
    expect(paidSlot?.href).toBe("/conversar");
    expect(freeSlot?.id).toBe(paidSlot?.id);
  });

  it("never exposes a Bible tab or disabled Em breve tab in bottom models", () => {
    for (const plan of ["free", "paid"] as const) {
      const labels = getBottomNavTabs(plan).map((t) => t.label.toLowerCase());
      expect(labels.some((l) => l.includes("bíblia") || l.includes("biblia"))).toBe(
        false,
      );
      expect(labels.some((l) => l.includes("em breve"))).toBe(false);
    }
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toMatch(/Bíblia/);
    expect(nav).toMatch(/Em breve/);
    expect(nav).not.toMatch(/PRIMARY_DESTINATIONS/);
  });

  it("active tab detection is path-prefix safe for Início", () => {
    expect(isBottomNavTabActive("/inicio", "/inicio")).toBe(true);
    expect(isBottomNavTabActive("/inicio/extra", "/inicio")).toBe(false);
    expect(isBottomNavTabActive("/hoje", "/hoje")).toBe(true);
    expect(isBottomNavTabActive("/espaco/oracoes", "/espaco")).toBe(true);
    expect(isBottomNavTabActive("/jornadas/ansiedade", "/jornadas")).toBe(true);
  });

  it("platform nav items keep Espaço for PAID (Menu) and Caminhos label", () => {
    const paid = getPlatformNavItemsForState("active_ready");
    expect(paid.map((i) => i.href)).toEqual(
      expect.arrayContaining(["/hoje", "/conversar", "/jornadas", "/espaco", "/conversas"]),
    );
    expect(paid.find((i) => i.href === "/jornadas")?.label).toBe("Caminhos");
    expect(paid.map((i) => i.label)).not.toContain("Jornadas");

    const free = getPlatformNavItemsForState("confirmed_without_plan");
    expect(free.map((i) => i.href)).toEqual(
      expect.arrayContaining(["/hoje", "/espaco", "/jornadas"]),
    );
    expect(free.map((i) => i.href)).not.toContain("/conversar");
    expect(free.find((i) => i.href === "/jornadas")?.label).toBe("Caminhos");
  });

  it("entitlement variations: unpaid never chat-capable; paid ready is", () => {
    for (const state of [
      "confirmed_without_plan",
      "ended",
      "past_due",
      "payment_pending",
      "active_needs_personalization",
    ] as UserJourneyState[]) {
      expect(journeyAllowsChat(state)).toBe(false);
    }
    expect(journeyAllowsChat("active_ready")).toBe(true);
    expect(journeyAllowsChat("canceling_at_period_end")).toBe(true);
  });

  it("wires plan into layout and protects /hoje", () => {
    const layout = read("src", "app", "(platform)", "layout.tsx");
    expect(layout).toContain("getBottomNavPlan");
    expect(layout).toContain("plan={navPlan}");
    expect(PRIVATE_PLATFORM_PREFIXES).toContain("/hoje");
    const hoje = read("src", "app", "(platform)", "hoje", "page.tsx");
    expect(hoje).toContain("DailyHomeSection");
    expect(hoje).toContain("getAuthUserContext");
  });

  it("active state is not color-only (marker + weight)", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toContain("font-semibold text-wine");
    expect(nav).toContain("h-0.5 rounded-full bg-wine");
    expect(nav).toContain("min-h-11");
    expect(nav).toContain("min-w-[44px]");
    expect(nav).toContain("aria-current");
    expect(nav).toContain("pb-safe");
  });
});
