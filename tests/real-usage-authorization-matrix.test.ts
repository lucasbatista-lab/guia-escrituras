import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isApiPath,
  isPrivateAppPath,
  matchesPathPrefix,
  PRIVATE_ADMIN_PREFIXES,
  PRIVATE_PLATFORM_PREFIXES,
} from "@/lib/edge/private-paths";
import { canUseDeepResponseOnDemand } from "@/lib/entitlements/deep-response";
import { canUseReadingJourneys } from "@/lib/entitlements/reading-journeys";
import { getPlanByKey } from "@/lib/entitlements/plans";
import { validateCheckoutPlan } from "@/lib/signup-intents/params";
import { SYNTHETIC_USERS } from "./fixtures/synthetic-users";

const root = process.cwd();
function readSrc(...parts: string[]) {
  return readFileSync(join(root, "src", ...parts), "utf8");
}

describe("real-usage: anonymous private gates", () => {
  it("marks platform and admin HTML paths as private", () => {
    for (const path of [
      "/inicio",
      "/conversar",
      "/conversas",
      "/jornadas",
      "/jornadas/ansiedade-confianca",
      "/conta",
      "/admin",
      "/admin/usuarios",
    ]) {
      expect(isPrivateAppPath(path)).toBe(true);
    }
  });

  it("keeps marketing and auth entry public for HTML gate", () => {
    for (const path of ["/", "/planos", "/entrar", "/cadastro", "/recuperar-senha"]) {
      expect(isPrivateAppPath(path)).toBe(false);
    }
  });

  it("does not HTML-gate APIs (JSON 401/403 instead)", () => {
    expect(isApiPath("/api/chat")).toBe(true);
    expect(isApiPath("/api/journeys/progress")).toBe(true);
    expect(matchesPathPrefix("/api/chat", [...PRIVATE_PLATFORM_PREFIXES])).toBe(
      false,
    );
  });

  it("proxy redirects anonymous before acquisition cookies on private HTML", () => {
    const proxy = readSrc("lib", "supabase", "proxy.ts");
    expect(proxy).toContain("redirectAnonymousToLogin");
    expect(proxy).toContain("hasLikelySupabaseSessionCookie");
    expect(PRIVATE_ADMIN_PREFIXES).toContain("/admin");
  });
});

describe("real-usage: plan entitlement matrix", () => {
  it("Essencial: chat standard, no journeys, no deepen", () => {
    const u = SYNTHETIC_USERS["syn-essencial"];
    expect(canUseReadingJourneys(u.planKey)).toBe(false);
    expect(canUseDeepResponseOnDemand(u.planKey)).toBe(false);
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
  });

  it("Caminho: journeys yes, deepen no", () => {
    const u = SYNTHETIC_USERS["syn-caminho"];
    expect(canUseReadingJourneys(u.planKey)).toBe(true);
    expect(canUseDeepResponseOnDemand(u.planKey)).toBe(false);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
  });

  it("Profundo: journeys + deepen", () => {
    const u = SYNTHETIC_USERS["syn-profundo"];
    expect(canUseReadingJourneys(u.planKey)).toBe(true);
    expect(canUseDeepResponseOnDemand(u.planKey)).toBe(true);
    expect(getPlanByKey("profundo")?.priceMonthlyCents).toBe(18800);
  });

  it("Particular: journeys + deepen, no Stripe checkout", () => {
    const u = SYNTHETIC_USERS["syn-particular"];
    expect(canUseReadingJourneys(u.planKey)).toBe(true);
    expect(canUseDeepResponseOnDemand(u.planKey)).toBe(true);
    expect(validateCheckoutPlan("particular")).toEqual({
      ok: false,
      code: "request_access_plan",
    });
  });

  it("ended / no plan: no journeys and no deepen", () => {
    expect(canUseReadingJourneys(SYNTHETIC_USERS["syn-ended"].planKey)).toBe(
      false,
    );
    expect(
      canUseDeepResponseOnDemand(SYNTHETIC_USERS["syn-ended"].planKey),
    ).toBe(false);
  });
});

describe("real-usage: Essencial journey URL gate in pages", () => {
  it("slug and step pages redirect non-entitled to catalog", () => {
    const slugPage = readSrc("app", "(platform)", "jornadas", "[slug]", "page.tsx");
    const stepPage = readSrc(
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(slugPage).toContain("canUseReadingJourneys");
    expect(slugPage).toContain('redirect("/jornadas")');
    expect(stepPage).toContain("canUseReadingJourneys");
    expect(stepPage).toContain('redirect("/jornadas")');
  });

  it("catalog still renders preview path for non-entitled", () => {
    const catalog = readSrc("app", "(platform)", "jornadas", "page.tsx");
    expect(catalog).toContain("canUseReadingJourneys");
    expect(catalog).toContain("!entitled");
  });
});

describe("real-usage: admin isolation contracts", () => {
  it("admin layout requires isAdmin and states no conversation content", () => {
    const layout = readSrc("app", "admin", "layout.tsx");
    expect(layout).toContain("isAdmin");
    expect(layout).toMatch(/Sem conteúdo privado de conversas/i);
  });

  it("AdminUserDetail type exposes journey counters not message bodies", () => {
    const users = readSrc("lib", "admin", "users.ts");
    expect(users).toContain("journeyProgress:");
    expect(users).toContain("journeysStarted");
    expect(users).toContain("no message bodies");
    expect(users).not.toMatch(/messages\.content|messageBodies|conversationText/);
  });
});
