import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
  JOURNEY_PREVIEW_STEP_NUMBER,
  resolveEntitlements,
} from "@/lib/entitlements";
import {
  getSoftPaywallCopy,
  minimumPlanForResource,
} from "@/lib/commerce/soft-paywall";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("Caminhos FREE Day 1 interactive preview contract", () => {
  it("keeps reading_journeys off FREE and Essencial", () => {
    expect(canUseReadingJourneys(null)).toBe(false);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
    expect(canUseReadingJourneys("profundo")).toBe(true);
    expect(resolveEntitlements({ planKey: "essencial" }).has("reading_journeys")).toBe(
      false,
    );
  });

  it("opens Day 1 for FREE/Essencial; blocks Day 2+", () => {
    expect(JOURNEY_PREVIEW_STEP_NUMBER).toBe(1);
    expect(canAccessJourneyStep(null, 1)).toBe(true);
    expect(canAccessJourneyStep("essencial", 1)).toBe(true);
    expect(canAccessJourneyStep(null, 2)).toBe(false);
    expect(canAccessJourneyStep("essencial", 2)).toBe(false);
    expect(canAccessJourneyStep("caminho", 7)).toBe(true);
    expect(canAccessJourneyStep("profundo", 7)).toBe(true);
  });

  it("Day 2+ soft paywall minimum remains Caminho", () => {
    expect(minimumPlanForResource("jornadas")).toBe("caminho");
    expect(getSoftPaywallCopy("jornadas").minimumPlanKey).toBe("caminho");
  });

  it("Conversar stays Essencial; Aprofundar stays Profundo", () => {
    expect(minimumPlanForResource("conversar")).toBe("essencial");
    expect(resolveEntitlements({ planKey: "essencial" }).has("chat_standard")).toBe(
      true,
    );
    expect(resolveEntitlements({ planKey: "essencial" }).has("chat_deep")).toBe(
      false,
    );
    expect(resolveEntitlements({ planKey: "profundo" }).has("chat_deep")).toBe(
      true,
    );
    const conversar = read("src", "app", "(platform)", "conversar", "page.tsx");
    expect(conversar).toContain("SoftPaywallGate");
    expect(conversar).toContain('resource="conversar"');
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("Aprofundar · Profundo");
  });

  it("pages wire Day 1 open + Day 2 SoftPaywallGate without fake entitlement", () => {
    const catalog = read("src", "app", "(platform)", "jornadas", "page.tsx");
    const slug = read("src", "app", "(platform)", "jornadas", "[slug]", "page.tsx");
    const step = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    const complete = read(
      "src",
      "app",
      "api",
      "journeys",
      "progress",
      "complete",
      "route.ts",
    );
    const start = read(
      "src",
      "app",
      "api",
      "journeys",
      "progress",
      "start",
      "route.ts",
    );
    expect(catalog).toContain("Abrir Dia 1");
    expect(catalog).toContain("SoftPaywallSheet");
    expect(slug).toContain("canAccessJourneyStep");
    expect(slug).toContain("Abrir Dia 1");
    expect(step).toMatch(/if \(!canAccessJourneyStep[\s\S]*SoftPaywallGate/);
    expect(step).toContain("Contexto");
    expect(step).toContain("Passagem");
    expect(complete).toContain("requireJourneyEntitlementOrPreviewStep");
    expect(start).toContain("requireJourneyPreviewStart");
    expect(complete).not.toMatch(
      /canUseReadingJourneys\([^)]*\)\s*=\s*true/,
    );
  });

  it("Início FREE uses InicioLiving without silent redirect", () => {
    const page = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(page).toContain("InicioLiving");
    expect(page).toMatch(/confirmed_without_plan[\s\S]*InicioLiving/);
    expect(page).toContain("allowsChat={false}");
  });
});
