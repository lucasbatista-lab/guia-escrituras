import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { journeyIntro } from "@/lib/journeys/presentation";
import { getJourneyBySlug } from "@/lib/journeys/registry";
import {
  CROSS_SURFACE_COMMERCIAL_FAQ,
  PLAN_COMMERCIAL_FAQ,
} from "@/lib/marketing/plan-faq";
import { canAccessJourneyStep, canUseReadingJourneys } from "@/lib/entitlements";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("app chrome — authenticated core uses AppScreenHeader", () => {
  it("Conta / Conversas / Personalizar migrate off PlatformPageHeader", () => {
    for (const page of [
      ["src", "app", "(platform)", "conta", "page.tsx"],
      ["src", "app", "(platform)", "conversas", "page.tsx"],
      ["src", "app", "(platform)", "personalizar", "page.tsx"],
    ] as const) {
      const src = read(...page);
      expect(src).toContain("AppScreenHeader");
      expect(src).not.toContain("PlatformPageHeader");
    }
    const conta = read("src", "app", "(platform)", "conta", "page.tsx");
    expect(conta).toContain('title="Conta"');
    expect(conta).toContain("SubscriptionManagementPanel");
    const conversas = read("src", "app", "(platform)", "conversas", "page.tsx");
    expect(conversas).toContain('title="Conversas"');
    expect(conversas).toContain("ConversationHistoryList");
    expect(conversas).toContain('href="/conversar"');
    const personalizar = read(
      "src",
      "app",
      "(platform)",
      "personalizar",
      "page.tsx",
    );
    expect(personalizar).toContain('title="Personalizar"');
    expect(personalizar).toContain("PersonalizationForm");
  });

  it("Inicio transitional states use AppScreenHeader", () => {
    const page = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(page).toContain("AppScreenHeader");
    expect(page).not.toContain("PlatformPageHeader");
    expect(page).not.toContain("ThemeShortcutsSection");
    expect(page).not.toContain("QuickActions");
  });
});

describe("caminhos microcopy — human temporal language", () => {
  it("presentation defaults speak in days, not syllabus etapas", () => {
    const journey = getJourneyBySlug("ansiedade-confianca")!;
    const intro = journeyIntro({ ...journey, intro: undefined });
    expect(intro.toLowerCase()).toContain("sete dias");
    const presentation = read("src", "lib", "journeys", "presentation.ts");
    expect(presentation).toContain("São sete dias");
    expect(presentation).not.toContain("São sete etapas");
    const complete = read(
      "src",
      "components",
      "journeys",
      "journey-step-complete-button.tsx",
    );
    expect(complete).toContain("Dia concluído");
    expect(complete).toContain("Concluir o dia");
    expect(complete).not.toContain("Etapa concluída");
    expect(complete).not.toContain("Próxima etapa");
  });

  it("gates remain intact", () => {
    expect(canAccessJourneyStep(null, 1)).toBe(true);
    expect(canAccessJourneyStep("essencial", 1)).toBe(true);
    expect(canAccessJourneyStep("essencial", 2)).toBe(false);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
  });
});

describe("marketing FAQ density", () => {
  it("home FAQ is lean and keeps commercial honesty items", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    expect(home).toContain("CROSS_SURFACE_COMMERCIAL_FAQ");
    const faqBlock = home.slice(home.indexOf("const faq = ["), home.indexOf("];", home.indexOf("const faq = [")) + 1);
    const localQs = (faqBlock.match(/q:\s*"/g) ?? []).length;
    expect(localQs + CROSS_SURFACE_COMMERCIAL_FAQ.length).toBeLessThanOrEqual(8);
    expect(localQs + CROSS_SURFACE_COMMERCIAL_FAQ.length).toBeGreaterThanOrEqual(5);
    expect(PLAN_COMMERCIAL_FAQ.length).toBeLessThanOrEqual(8);
    expect(PLAN_COMMERCIAL_FAQ.length).toBeGreaterThanOrEqual(5);
    for (const item of CROSS_SURFACE_COMMERCIAL_FAQ) {
      expect(PLAN_COMMERCIAL_FAQ.some((f) => f.q === item.q && f.a === item.a)).toBe(
        true,
      );
    }
  });
});

describe("legacy cleanup — verified dead surfaces", () => {
  it("removed components have no production imports", () => {
    expect(() =>
      read("src", "components", "interaction", "pressable.tsx"),
    ).toThrow();
    expect(() =>
      read("src", "components", "interaction", "app-section.tsx"),
    ).toThrow();
    expect(() =>
      read("src", "components", "daily", "hoje-com-deus-card.tsx"),
    ).toThrow();
    expect(() =>
      read("src", "components", "journeys", "journeys-inicio-card.tsx"),
    ).toThrow();
    const interaction = read("src", "components", "interaction", "index.ts");
    expect(interaction).not.toContain("Pressable");
    expect(interaction).not.toContain("AppSection");
    const memory = read("src", "components", "inicio", "memory-strip.tsx");
    expect(memory).toContain("loadRecentMemory");
    expect(memory).not.toContain("export function MemoryStrip");
  });
});
