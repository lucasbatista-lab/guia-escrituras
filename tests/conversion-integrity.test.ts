import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getSoftPaywallCopy,
  minimumPlanForResource,
  softPaywallViewerFromPlanKey,
} from "@/lib/commerce/soft-paywall";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
} from "@/lib/entitlements";
import { resolveEntitlements } from "@/lib/entitlements";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("conversion integrity — Hoje mid CTA", () => {
  it("mid phase has one primary Continuar and secondary text save/share", () => {
    const ritual = read("src", "components", "daily", "hoje-ritual.tsx");
    const mid = ritual.slice(
      ritual.indexOf('data-hoje-phase="mid"'),
      ritual.indexOf("{status ?", ritual.indexOf('data-hoje-phase="mid"')),
    );
    expect(mid).toContain("Continuar");
    expect(mid).toContain('variant="ritual"');
    expect(mid).toContain("Salvar");
    expect(mid).toContain("Compartilhar");
    expect(mid).not.toMatch(/variant="outline"[\s\S]*Compartilhar/);
    expect(mid).not.toMatch(/variant="ghost"[\s\S]*Salvar/);
    expect(mid).toContain("amem-press");
  });
});

describe("conversion integrity — Caminhos Day1 vs LockPill", () => {
  it("FREE and ESSENCIAL can open Day 1; Day 2+ requires Caminho", () => {
    expect(canAccessJourneyStep(null, 1)).toBe(true);
    expect(canAccessJourneyStep("essencial", 1)).toBe(true);
    expect(canAccessJourneyStep(null, 2)).toBe(false);
    expect(canAccessJourneyStep("essencial", 2)).toBe(false);
    expect(canAccessJourneyStep("caminho", 2)).toBe(true);
    expect(canAccessJourneyStep("profundo", 7)).toBe(true);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
  });

  it("preview catalog card does not pair LockPill with Abrir Dia 1", () => {
    const card = read(
      "src",
      "components",
      "journeys",
      "journey-catalog-card.tsx",
    );
    expect(card).toContain("Abrir Dia 1");
    expect(card).toContain("Dia 1 grátis");
    expect(card).toContain("Completo no plano Caminho");
    expect(card).not.toContain("LockPill");
  });
});

describe("conversion integrity — SoftPaywall copy by entitlement", () => {
  it("maps resources to minimum plans without Profundo for Conversar", () => {
    expect(minimumPlanForResource("conversar")).toBe("essencial");
    expect(minimumPlanForResource("jornadas")).toBe("caminho");
    expect(resolveEntitlements({ planKey: "essencial" }).has("chat_standard")).toBe(
      true,
    );
  });

  it("FREE Conversar copy may say grátis; Essencial Caminhos must not", () => {
    const freeChat = getSoftPaywallCopy("conversar", { kind: "free" });
    expect(freeChat.minimumPlanKey).toBe("essencial");
    expect(freeChat.dismissLabel).toMatch(/grátis/i);
    expect(freeChat.footerNote).toMatch(/Conta grátis/i);
    expect(freeChat.teaserBody).toMatch(/conta grátis/i);

    const essencialJ = getSoftPaywallCopy("jornadas", {
      kind: "plan",
      planKey: "essencial",
    });
    expect(essencialJ.minimumPlanKey).toBe("caminho");
    expect(essencialJ.dismissLabel).not.toMatch(/grátis/i);
    expect(essencialJ.footerNote).not.toMatch(/Conta grátis/i);
    expect(essencialJ.teaserBody).not.toMatch(/conta grátis/i);
    expect(essencialJ.body).toMatch(/Dia 1/i);
    expect(essencialJ.footerNote).toMatch(/Essencial/i);

    expect(softPaywallViewerFromPlanKey(null)).toEqual({ kind: "free" });
    expect(softPaywallViewerFromPlanKey("essencial")).toEqual({
      kind: "plan",
      planKey: "essencial",
    });
  });

  it("SoftPaywallSheet emits viewed once and clicked once without private fields", () => {
    const sheet = read(
      "src",
      "components",
      "commerce",
      "soft-paywall-sheet.tsx",
    );
    expect(sheet).toContain('premium_prompt_viewed');
    expect(sheet).toContain('premium_prompt_clicked');
    expect(sheet).toContain("viewedSentRef");
    expect(sheet).toContain("clickedSentRef");
    expect(sheet).toContain("trackPrimaryClick");
    expect(sheet).not.toMatch(/prayer|journal|email|displayName/);
    const types = read("src", "lib", "product-events", "types.ts");
    expect(types).toContain('"/jornadas"');
  });
});

describe("conversion integrity — Planos Dia 1", () => {
  it("Essencial compare row is Dia 1 preview, not blank exclusion", () => {
    const compare = read(
      "src",
      "components",
      "marketing",
      "plan-compare-static.tsx",
    );
    expect(compare).toContain("Dia 1 grátis · completo no Caminho");
    const caminhosBlock = compare.match(
      /label:\s*"Caminhos",\s*values:\s*\{[^}]+\}/,
    )?.[0];
    expect(caminhosBlock).toBeTruthy();
    expect(caminhosBlock).toContain('essencial: "Dia 1 grátis · completo no Caminho"');
    expect(caminhosBlock).not.toContain("Não incluso");
    const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
    expect(planos).toMatch(/Dia 1 dos Caminhos/i);
    expect(planos).toMatch(/Essencial abre\s+Conversar/i);
  });
});
