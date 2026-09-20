import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FREE_ACCOUNT_BENEFITS,
  FREE_ACCOUNT_STATUS_LABEL,
  getSoftPaywallCopy,
  journeyShowsSoftPaywall,
  minimumPlanForResource,
} from "@/lib/commerce/soft-paywall";
import { canUseReadingJourneys } from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";
import type { UserJourneyState } from "@/lib/journey/journey-state";

const root = process.cwd();
function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W0 soft paywall foundation", () => {
  it("FREE / ended states show soft paywall instead of silent bounce", () => {
    expect(journeyShowsSoftPaywall("confirmed_without_plan")).toBe(true);
    expect(journeyShowsSoftPaywall("ended")).toBe(true);
    for (const state of [
      "active_ready",
      "canceling_at_period_end",
      "payment_pending",
      "payment_processing",
      "active_needs_personalization",
      "past_due",
      "anonymous",
      "awaiting_email_confirmation",
    ] as UserJourneyState[]) {
      expect(journeyShowsSoftPaywall(state)).toBe(false);
    }
  });

  it("minimum plan for Conversar is Essencial (chat_standard)", () => {
    expect(minimumPlanForResource("conversar")).toBe("essencial");
    const copy = getSoftPaywallCopy("conversar");
    expect(copy.minimumPlanKey).toBe("essencial");
    expect(copy.minimumPlanName).toBe("Essencial");
    expect(copy.badgeLabel).toBe("Essencial");
    expect(copy.resourceLabel).toBe("Conversar");
    expect(copy.footerNote).toMatch(/Conta grátis continua/i);
    expect(resolveEntitlements({ planKey: "essencial" }).has("chat_standard")).toBe(
      true,
    );
  });

  it("minimum plan for Jornadas/Caminhos is Caminho — not Profundo", () => {
    expect(minimumPlanForResource("jornadas")).toBe("caminho");
    const copy = getSoftPaywallCopy("jornadas");
    expect(copy.minimumPlanKey).toBe("caminho");
    expect(copy.minimumPlanName).toBe("Caminho");
    expect(copy.badgeLabel).toBe("Caminho");
    expect(copy.badgeLabel.toLowerCase()).not.toBe("profundo");
    expect(canUseReadingJourneys("caminho")).toBe(true);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys(null)).toBe(false);
  });

  it("conta free copy is honest about Conta grátis ativa", () => {
    const page = readSrc("src", "app", "(platform)", "conta", "page.tsx");
    expect(page).toContain("FREE_ACCOUNT_STATUS_LABEL");
    expect(page).toContain("FREE_ACCOUNT_BENEFITS");
    expect(page).not.toContain("Não há plano gratuito");
    expect(FREE_ACCOUNT_STATUS_LABEL).toBe("Conta grátis ativa");
    expect([...FREE_ACCOUNT_BENEFITS]).toEqual([
      "Hoje com Deus",
      "Orações",
      "Diário",
      "Salvos",
    ]);
  });

  it("usage API no longer denies free account existence", () => {
    const route = readSrc("src", "app", "api", "usage", "route.ts");
    expect(route).toContain("Conta grátis ativa");
    expect(route).not.toContain("Não há plano gratuito");
  });

  it("conversar and jornadas render SoftPaywallGate for FREE (no silent /inicio)", () => {
    const conversar = readSrc("src", "app", "(platform)", "conversar", "page.tsx");
    expect(conversar).toContain("SoftPaywallGate");
    expect(conversar).toContain('resource="conversar"');
    expect(conversar).toContain("journeyShowsSoftPaywall");
    expect(conversar.indexOf("journeyShowsSoftPaywall")).toBeLessThan(
      conversar.indexOf("getRequiredDestinationForState"),
    );

    const jornadas = readSrc("src", "app", "(platform)", "jornadas", "page.tsx");
    expect(jornadas).toContain("SoftPaywallGate");
    expect(jornadas).toContain('resource="jornadas"');
    expect(jornadas).toContain("journeyShowsSoftPaywall");

    const proxy = readSrc("src", "lib", "supabase", "proxy.ts");
    expect(proxy).toContain("journeyShowsSoftPaywall");
    expect(proxy).toContain("SoftPaywallSheet");
  });

  it("SoftPaywallSheet is dismissible and keeps free value messaging", () => {
    const sheet = readSrc(
      "src",
      "components",
      "commerce",
      "soft-paywall-sheet.tsx",
    );
    expect(sheet).toContain("useState(defaultOpen)");
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain("dismiss");
    expect(sheet).toContain("PremiumBadge");
    expect(sheet).toContain("LockPill");
    expect(sheet).toContain("Escape");
  });

  it("paid active users still use chat entitlement gate (no improper free paywall helper)", () => {
    expect(journeyShowsSoftPaywall("active_ready")).toBe(false);
    expect(journeyShowsSoftPaywall("canceling_at_period_end")).toBe(false);
    const conversar = readSrc("src", "app", "(platform)", "conversar", "page.tsx");
    expect(conversar).toContain("journeyAllowsChat");
    // Soft paywall only when chat not allowed AND soft-paywall state.
    expect(conversar).toMatch(
      /if \(!journeyAllowsChat[\s\S]*journeyShowsSoftPaywall[\s\S]*SoftPaywallGate/,
    );
  });
});
