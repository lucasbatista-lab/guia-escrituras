import { describe, expect, it, vi, afterEach } from "vitest";
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

// Top-level so Vitest hoist order matches intent.
vi.unmock("@/config/runtime");
vi.unmock("next/navigation");

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
    expect(copy.title).toMatch(/Conversar/i);
    expect(copy.benefits.join(" ")).toMatch(/Hoje e Espaço continuam grátis/i);
    expect(copy.eyebrow).toBe("ACOMPANHAMENTO");
    expect(copy.eyebrow.toLowerCase()).not.toContain("aprofundar");
    expect(copy.dismissLabel).toBe("Ficar no grátis");
    expect(copy.leaveLabel).toBe("Voltar ao Hoje");
    expect(copy.dismissHref).toBe("/inicio");
    expect(copy.footerNote).toMatch(/Conta grátis continua/i);
    expect(copy.teaserBody).toMatch(/conta grátis/i);
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
    expect(copy.eyebrow).toBe("CAMINHOS");
    expect(copy.eyebrow.toLowerCase()).not.toContain("aprofundar");
    expect(copy.dismissLabel).toBe("Ficar no grátis");
    expect(copy.leaveLabel).toBe("Voltar ao Hoje");
    expect(copy.dismissHref).toBe("/inicio");
    expect(canUseReadingJourneys("caminho")).toBe(true);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys(null)).toBe(false);
  });

  it("Essencial Caminhos paywall never uses conta grátis language", () => {
    const copy = getSoftPaywallCopy("jornadas", {
      kind: "plan",
      planKey: "essencial",
    });
    expect(copy.dismissLabel).not.toMatch(/grátis/i);
    expect(copy.footerNote).not.toMatch(/Conta grátis/i);
    expect(copy.teaserBody).not.toMatch(/conta grátis/i);
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
      "Dia 1 dos Caminhos",
    ]);
  });

  it("usage API no longer denies free account existence", () => {
    const route = readSrc("src", "app", "api", "usage", "route.ts");
    expect(route).toContain("Conta grátis ativa");
    expect(route).not.toContain("Não há plano gratuito");
  });

  it("free /conversar reaches page-level SoftPaywallGate (proxy allows soft states through)", () => {
    const conversar = readSrc("src", "app", "(platform)", "conversar", "page.tsx");
    expect(conversar).toContain("SoftPaywallGate");
    expect(conversar).toContain('resource="conversar"');
    expect(conversar).toContain("journeyShowsSoftPaywall");
    expect(conversar.indexOf("journeyShowsSoftPaywall")).toBeLessThan(
      conversar.indexOf("getRequiredDestinationForState"),
    );

    // Proxy behavioral contract: soft-paywall states pass through to the page
    // (no silent /inicio). Do not couple to SoftPaywallSheet component strings.
    const proxy = readSrc("src", "lib", "supabase", "proxy.ts");
    expect(proxy).toContain("journeyShowsSoftPaywall");
    expect(proxy).toMatch(
      /pathname === "\/conversar"[\s\S]*?journeyShowsSoftPaywall\([\s\S]*?return supabaseResponse/,
    );
    expect(proxy).not.toMatch(/SoftPaywallSheet/);
  });

  it("jornadas FREE reaches Day 1 preview; Day 2+ SoftPaywallGate is page-level", () => {
    const jornadas = readSrc("src", "app", "(platform)", "jornadas", "page.tsx");
    expect(jornadas).toContain("SoftPaywallSheet");
    expect(jornadas).toContain("journeyShowsSoftPaywall");
    expect(readSrc("src", "components", "journeys", "journey-catalog-card.tsx")).toContain("Abrir Dia 1");
    expect(jornadas).toContain("!entitled");

    const slug = readSrc(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "page.tsx",
    );
    expect(slug).toContain("SoftPaywallSheet");
    expect(slug).toContain("journeyShowsSoftPaywall");
    expect(slug).toContain("canAccessJourneyStep");
    expect(slug).toContain("Abrir Dia 1");

    const step = readSrc(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(step).toContain("SoftPaywallGate");
    expect(step).toContain('resource="jornadas"');
    expect(step).toMatch(
      /if \(!canAccessJourneyStep[\s\S]*SoftPaywallGate/,
    );

    // Jornadas entitlement gate lives on the page; proxy has no jornadas SoftPaywall coupling.
    const proxy = readSrc("src", "lib", "supabase", "proxy.ts");
    const jornadasInProxy = /pathname[\s\S]{0,80}\/jornadas/.test(proxy);
    // If proxy mentions jornadas paths in future, it still must not hard-code sheet component names.
    if (jornadasInProxy) {
      expect(proxy).not.toMatch(/SoftPaywallSheet/);
    }
  });

  it("SoftPaywallSheet is dismissible with a11y contract and premium Button primitive", () => {
    const sheet = readSrc(
      "src",
      "components",
      "commerce",
      "soft-paywall-sheet.tsx",
    );
    expect(sheet).toContain("useState(defaultOpen)");
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain("aria-modal");
    expect(sheet).toContain("aria-labelledby");
    expect(sheet).toContain("aria-describedby");
    expect(sheet).toContain("dismiss");
    expect(sheet).toContain("PremiumBadge");
    expect(sheet).toContain("LockPill");
    expect(sheet).toContain("Escape");
    expect(sheet).toContain('variant="premium"');
    // Premium CTA = wine + brass hairline (V17); gold alias remains on Button.
    expect(sheet).toMatch(
      /<Button[\s\S]*?variant="premium"[\s\S]*?<Link href=\{copy\.ctaHref\}/,
    );
    expect(sheet).toContain("premium_prompt_clicked");
    expect(sheet).toContain("trackPrimaryClick");
    expect(sheet).toContain("copy.teaserBody");
    expect(sheet).not.toContain("Sua conta grátis permanece");
    expect(sheet).not.toMatch(
      /<Button[^>]*variant="premium"[^>]*style=/,
    );
    // Focus trap + scroll lock + restore hooks present.
    expect(sheet).toContain("listFocusable");
    expect(sheet).toContain('document.body.style.overflow = "hidden"');
    expect(sheet).toContain('document.body.style.position = "fixed"');
    expect(sheet).toContain("restoreFocusRef");
    expect(sheet).toContain("copy.leaveLabel");
    expect(sheet).toContain("copy.dismissLabel");
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

describe("W0 QA route /dev/amem-w0-qa hardening", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("robots production disallow includes /dev (crawl hint, not auth)", () => {
    const robotsSrc = readSrc("src", "app", "robots.ts");
    expect(robotsSrc).toContain('"/dev"');
    expect(robotsSrc).toContain('"/dev/"');
  });

  it("QA page is not served when mocks are not allowed (notFound/404)", async () => {
    vi.resetModules();
    const notFound = vi.fn(() => {
      const err = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
      (err as Error & { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
      throw err;
    });
    vi.doMock("next/navigation", () => ({ notFound }));
    vi.doMock("@/config/runtime", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/config/runtime")>();
      return {
        ...actual,
        allowsMocks: () => false,
        getAppRuntime: () => "production" as const,
      };
    });

    const mod = await import("@/app/dev/amem-w0-qa/page");
    await expect(
      mod.default({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/404|NOT_FOUND|FALLBACK/i);
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("QA page source keeps development + allowsMocks fail-closed (no mock expansion)", () => {
    const page = readSrc("src", "app", "dev", "amem-w0-qa", "page.tsx");
    expect(page).toContain("getAppRuntime()");
    expect(page).toContain('!== "development"');
    expect(page).toContain("allowsMocks()");
    expect(page).toContain("notFound()");
    expect(page).not.toMatch(/allowsMocks\s*=\s*\(\)\s*=>\s*true/);
  });
});
