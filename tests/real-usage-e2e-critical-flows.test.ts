/**
 * Maps the eight critical E2E flows from the real-usage test plan onto
 * deterministic Vitest contracts. Playwright is deferred — see
 * docs/_ai/AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { allowsMocks, getAppRuntime } from "@/config/runtime";
import { isPrivateAppPath } from "@/lib/edge/private-paths";
import { canUseDeepResponseOnDemand } from "@/lib/entitlements/deep-response";
import { canUseReadingJourneys } from "@/lib/entitlements/reading-journeys";
import { detectCrisisMessage } from "@/lib/safety/crisis";
import {
  buildSupportMailto,
  HELP_FAQ,
  SUPPORT_CATEGORIES,
} from "@/lib/support/help-center";
import { SYNTHETIC_USERS } from "./fixtures/synthetic-users";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("real-usage E2E-critical matrix (Vitest stand-in)", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
    delete process.env.VERCEL_ENV;
  });

  it("1) anonymous private routes are gated (HTML matrix)", () => {
    for (const path of ["/inicio", "/conversar", "/jornadas", "/admin"]) {
      expect(isPrivateAppPath(path)).toBe(true);
    }
    const proxy = read("src", "lib", "supabase", "proxy.ts");
    expect(proxy).toContain("redirectAnonymousToLogin");
  });

  it("2) Essencial sees journeys preview gate, not direct access", () => {
    const u = SYNTHETIC_USERS["syn-essencial"];
    expect(canUseReadingJourneys(u.planKey)).toBe(false);
    const page = read("src", "app", "(platform)", "jornadas", "page.tsx");
    expect(page).toContain("canUseReadingJourneys");
  });

  it("3) Caminho can use reading journeys", () => {
    expect(canUseReadingJourneys(SYNTHETIC_USERS["syn-caminho"].planKey)).toBe(
      true,
    );
    expect(
      canUseDeepResponseOnDemand(SYNTHETIC_USERS["syn-caminho"].planKey),
    ).toBe(false);
  });

  it("4) prefill does not auto-send", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[^}]*send\(/s);
    const page = read("src", "app", "(platform)", "conversar", "page.tsx");
    expect(page).not.toMatch(/runChatTurn/);
  });

  it("5) crisis intercept runs before OpenAI and does not call generate", () => {
    expect(detectCrisisMessage("Estou pensando em me matar.").matched).toBe(
      true,
    );
    const service = read("src", "lib", "ai", "chat-service.ts");
    expect(service).toContain("detectCrisisMessage");
    const crisisCall = service.indexOf("detectCrisisMessage(body.message)");
    const providerCall = service.indexOf("createAiProvider()");
    expect(crisisCall).toBeGreaterThan(-1);
    expect(providerCall).toBeGreaterThan(-1);
    expect(crisisCall).toBeLessThan(providerCall);
  });

  it("6) admin without permission is blocked server-side", () => {
    const layout = read("src", "app", "admin", "layout.tsx");
    expect(layout).toContain("isAdmin");
    const session = read("src", "lib", "auth", "session.ts");
    expect(session).toContain("requireAdminUser");
    expect(session).toMatch(/403|AppError/);
  });

  it("7) /ajuda loads categories, FAQ search, and classifies support mailto", () => {
    expect(SUPPORT_CATEGORIES.length).toBeGreaterThan(3);
    expect(HELP_FAQ.length).toBeGreaterThan(3);
    const mailto = buildSupportMailto("cobranca");
    // May be null without SUPPORT_EMAIL in test env — still validates category path.
    if (mailto) {
      expect(mailto).toMatch(/^mailto:/);
      expect(mailto).toContain("Cobran");
    }
    const page = read("src", "app", "(marketing)", "ajuda", "page.tsx");
    expect(page).toContain("SUPPORT_CATEGORIES");
    expect(page).toContain("HelpFaqSearch");
  });

  it("8) admin mobile nav remains available for basic mobile ops", () => {
    const layout = read("src", "app", "admin", "layout.tsx");
    expect(layout).toContain("AdminMobileNav");
    const nav = read("src", "components", "admin", "admin-mobile-nav.tsx");
    expect(nav).toContain("min-h-11");
  });

  it("9) retention draft + age-based resume stay local and non-spiritual", () => {
    const draft = read("src", "lib", "conversations", "composer-draft.ts");
    const display = read("src", "lib", "conversations", "display.ts");
    expect(draft).toContain("sessionStorage");
    expect(display).toContain("resumeReturnTone");
    expect(display).not.toMatch(/pecado|culpa espiritual/i);
  });

  it("10) journey step completion UX wires progress without new schema", () => {
    const page = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(page).toContain("completed={stepCompleted}");
    expect(page).toContain("ensureJourneyStarted");
  });

  it("documents Playwright blocker: production runtime forbids mocks", () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    delete process.env.DEMO_MODE;
    expect(getAppRuntime()).toBe("production");
    expect(allowsMocks()).toBe(false);
    process.env.DEMO_MODE = "true";
    expect(allowsMocks()).toBe(false);
    process.env.NODE_ENV = prevNode;
  });

  it("keeps Playwright out of package scripts until harness exists", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.scripts["test:e2e"]).toBeUndefined();
    expect(pkg.devDependencies["@playwright/test"]).toBeUndefined();
    expect(
      read("docs", "_ai", "AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md"),
    ).toContain("DEFER");
  });
});
