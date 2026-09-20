import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
  resolveEntitlements,
} from "@/lib/entitlements";
import {
  getSoftPaywallCopy,
  minimumPlanForResource,
} from "@/lib/commerce/soft-paywall";
import {
  BOTTOM_NAV_FREE,
  BOTTOM_NAV_PAID,
} from "@/lib/journey/bottom-nav";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("Wave 3B Conversar V17 editorial", () => {
  it("uses editorial grammar — user capsule + wine filet group, not beige bubbles", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    const css = read("src", "app", "globals.css");
    expect(panel).toContain("amem-lex-user");
    expect(panel).toContain("amem-lex-group");
    expect(panel).toContain("amem-lex-scripture");
    expect(panel).toContain("Conversar");
    expect(panel).toContain("amem-badge-essencial");
    expect(panel).toContain("Companheiro editorial");
    expect(panel).toContain("Escreva com honestidade");
    expect(panel).not.toContain("bg-sand-50/95");
    expect(panel).not.toContain("rounded-br-md bg-ink text-sand-50");
    expect(css).toContain(".amem-lex-user");
    expect(css).toContain(".amem-lex-group");
    expect(css).toContain("border-left: 2.5px solid var(--amem-wine)");
  });

  it("keeps streaming, safety, deepen, history, and composer contracts", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("consumeChatNdjsonStream");
    expect(panel).toContain("conversationHasCrisisSafetyMode");
    expect(panel).toContain("safetyMode");
    expect(panel).toContain("preferDeep");
    expect(panel).toContain("Aprofundar · Profundo");
    expect(panel).toContain("Orar essa frase");
    expect(panel).toContain("Versículo curto");
    expect(panel).toContain("Histórico");
    expect(panel).toContain("/api/chat");
    expect(panel).toContain("safe-composer-above-nav");
    expect(panel).toContain("chatFeatureDisabled");
    // Aprofundar is Profundo — never claim Profundo required to chat
    expect(panel.toLowerCase()).not.toMatch(
      /profundo[^\n]{0,40}(necessário|obrigatório|required).{0,20}chat/,
    );
  });

  it("FREE conversar still soft-paywalls Essencial; chat_standard is Essencial", () => {
    expect(minimumPlanForResource("conversar")).toBe("essencial");
    expect(getSoftPaywallCopy("conversar").minimumPlanKey).toBe("essencial");
    expect(resolveEntitlements({ planKey: "essencial" }).has("chat_standard")).toBe(
      true,
    );
    const page = read("src", "app", "(platform)", "conversar", "page.tsx");
    expect(page).toContain("SoftPaywallGate");
    expect(page).toContain('resource="conversar"');
    expect(page).toContain("journeyAllowsChat");
  });

  it("mobile shell keeps bottom nav on Conversar without sticky Amém Chat header", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toContain("showBottomNav && bottomTabs");
    expect(nav).not.toContain("isChat");
    expect(nav).toMatch(/showBottomNav \?[\s\S]*pt-safe/);
  });
});

describe("Wave 3B Caminhos / Jornadas V17", () => {
  it("UI label is Caminhos while routes stay /jornadas", () => {
    const catalog = read("src", "app", "(platform)", "jornadas", "page.tsx");
    const step = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(catalog).toContain("Caminhos");
    expect(catalog).toContain("Sete dias com um tema");
    expect(step).toContain("Caminhos");
    expect(step).toContain('href="/jornadas"');
    expect(BOTTOM_NAV_FREE.some((t) => t.label === "Caminhos" && t.href === "/jornadas")).toBe(
      true,
    );
    expect(BOTTOM_NAV_PAID.some((t) => t.label === "Caminhos" && t.href === "/jornadas")).toBe(
      true,
    );
  });

  it("FREE/Essencial Day 1 preview + SoftPaywallSheet; paid catalog shows active resume", () => {
    const catalog = read("src", "app", "(platform)", "jornadas", "page.tsx");
    expect(catalog).toContain("SoftPaywallSheet");
    expect(catalog).toContain("!entitled");
    expect(catalog).toContain("Abrir Dia 1");
    expect(catalog).toContain("Prévia · Dia 1");
    expect(catalog).toContain("Em andamento");
    expect(catalog).toContain("journeyResumeHint");
    expect(catalog).toContain("journeyShowsSoftPaywall");
    expect(catalog).not.toMatch(/grid-cols-3 divide-x/);
    expect(canUseReadingJourneys(null)).toBe(false);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
    expect(canAccessJourneyStep(null, 1)).toBe(true);
    expect(canAccessJourneyStep("essencial", 1)).toBe(true);
    expect(canAccessJourneyStep(null, 2)).toBe(false);
    expect(canAccessJourneyStep("essencial", 2)).toBe(false);
    expect(canAccessJourneyStep("caminho", 2)).toBe(true);
    expect(minimumPlanForResource("jornadas")).toBe("caminho");
    expect(getSoftPaywallCopy("jornadas").minimumPlanKey).toBe("caminho");
  });

  it("Day 2+ SoftPaywallGate — Day 1 opens; never silent redirect on entitlement", () => {
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
    expect(slug).toContain("canAccessJourneyStep");
    expect(slug).toContain("LockPill");
    expect(slug).toContain("SoftPaywallSheet");
    expect(slug).toContain("Abrir Dia 1");
    expect(step).toMatch(/if \(!canAccessJourneyStep[\s\S]*SoftPaywallGate/);
    expect(step).toContain('resource="jornadas"');
    expect(step).toContain("Contexto");
    expect(step).toContain("Passagem");
    expect(step).toContain("Fecho · Levo");
    expect(step).toContain("Sem culpa se voltar depois");
    expect(step.toLowerCase()).not.toContain("streak");
  });

  it("nav FREE/PAID morph preserved", () => {
    expect(BOTTOM_NAV_FREE.map((t) => t.label)).toEqual([
      "Início",
      "Hoje",
      "Espaço",
      "Caminhos",
    ]);
    expect(BOTTOM_NAV_PAID.map((t) => t.label)).toEqual([
      "Início",
      "Hoje",
      "Conversar",
      "Caminhos",
    ]);
  });
});
