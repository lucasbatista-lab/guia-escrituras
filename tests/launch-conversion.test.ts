import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getBrandConfig } from "@/config/brand";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("launch conversion home", () => {
  const home = read("src", "app", "(marketing)", "page.tsx");
  const demo = read("src", "components", "marketing", "chat-demo.tsx");
  const trust = read(
    "src",
    "components",
    "marketing",
    "trust-principles.tsx",
  );
  const plans = read("src", "lib", "entitlements", "plans.ts");
  const stripeCheckout = read("src", "lib", "stripe", "checkout.ts");
  const chatService = read("src", "lib", "ai", "chat-service.ts");
  const adminMetrics = read("src", "lib", "admin", "metrics.ts");

  it("keeps mother line out of hero and uses product-first conversion copy", () => {
    const chrome = read("src", "components", "marketing", "site-chrome.tsx");
    expect(chrome).toContain("brand.description");
    expect(chrome).toContain("md:block");
    expect(home).not.toContain("brand.tagline");
    expect(home).toContain(
      "Quando algo estiver pesando, encontre clareza à luz das Escrituras.",
    );
    expect(home).toContain("IA e limites honestos");
    expect(home).toContain("<ProductHeroPreview");
    expect(home).toContain("voz divina");
  });

  it("makes product discovery the primary CTA and plans secondary", () => {
    expect(home).toContain('href="#demonstracao"');
    expect(home).toContain("Conhecer o Amém Chat");
    expect(home).toContain("Ver planos");
    expect(home).toContain("TrackingLink");
    expect(home).toContain('href="/planos"');
    expect(home).toContain("R$ 38");
    const heroSlice = home.slice(
      home.indexOf("animate-fade-up"),
      home.indexOf("demo-heading"),
    );
    const primaryIdx = heroSlice.indexOf("Conhecer o Amém Chat");
    const secondaryIdx = heroSlice.indexOf("Ver planos");
    expect(primaryIdx).toBeGreaterThan(-1);
    expect(secondaryIdx).toBeGreaterThan(primaryIdx);
    expect(heroSlice).not.toMatch(/Stripe/i);
    expect(heroSlice).not.toContain("brand.description");
  });

  it("presents the ecosystem and continuity before plans", () => {
    const demoIdx = home.indexOf("<ChatDemo");
    const plansIdx = home.indexOf("<PlanCards");
    const ecosystemIdx = home.indexOf("<EcosystemShowcase");
    const journeyIdx = home.indexOf("<JourneyPreviewStatic");
    const deepenIdx = home.indexOf("<DeepenComparisonStatic");
    expect(demoIdx).toBeGreaterThan(-1);
    expect(ecosystemIdx).toBeGreaterThan(demoIdx);
    expect(journeyIdx).toBeGreaterThan(ecosystemIdx);
    expect(deepenIdx).toBeGreaterThan(journeyIdx);
    expect(plansIdx).toBeGreaterThan(deepenIdx);
    expect(demo).toContain("Tenho contas vencendo");
    expect(demo).toContain("Parece que Deus está em silêncio");
    expect(demo).toContain("Luto e saudade");
    expect(home).toContain("<TrustPrinciples");
    expect(home).toContain("Pagamento seguro");
    expect(home).toContain("Stripe");
    expect(home).toContain("cancel");
    expect(home).toContain('id="demonstracao"');
    expect(trust).toContain("Sem anúncios");
    expect(trust).toContain("Conversas não são públicas");
    expect(trust).toContain("Dados não são vendidos");
    expect(trust).toContain("Prestadores essenciais");
  });

  it("does not invent social proof, scarcity or unavailable features", () => {
    const lowered = home.toLowerCase();
    expect(lowered).not.toMatch(/depoimento|testemunho/);
    expect(lowered).not.toMatch(/usuários ativos|milhares de/);
    expect(lowered).not.toMatch(/apenas hoje|últimas vagas|contagem regressiva/);
    expect(lowered).not.toMatch(/garantia de/);
    expect(lowered).not.toMatch(/whatsapp/);
    expect(lowered).not.toMatch(/respostas em áudio|respostas em audio/);
  });

  it("ships local interactive demo without API or OpenAI calls", () => {
    expect(demo).toContain('"use client"');
    expect(demo).not.toContain('id="demonstracao"');
    expect(demo).toContain("Ansiedade e decisões");
    expect(demo).toContain("Dinheiro e trabalho");
    expect(demo).toContain("Perdão e família");
    expect(demo).toContain("Culpa e recomeço");
    expect(demo).toContain("Silêncio espiritual");
    expect(demo).toContain(
      "Estou com medo de tomar uma decisão errada e me arrepender",
    );
    expect(demo).toContain("Sem chamada à API");
    expect(demo).not.toContain("fetch(");
    expect(demo).not.toContain("/api/chat");
    expect(demo).not.toContain("openai");
    expect(demo).toContain("TrackingLink");
    expect(demo).toContain('href="/planos"');
    expect(demo).toContain("Ver os planos");
  });

  it("does not modify plans, stripe, chat or admin in this block", () => {
    expect(plans).toContain("priceMonthlyCents: 3800");
    expect(stripeCheckout).toContain("createSubscriptionCheckout");
    expect(chatService).toContain("runChatTurn");
    expect(adminMetrics).toContain("getAdminOverviewMetrics");
  });
});

describe("launch conversion cadastro", () => {
  const page = read("src", "app", "(auth)", "cadastro", "page.tsx");
  const form = read("src", "components", "auth", "sign-up-form.tsx");
  const chrome = read("src", "components", "marketing", "site-chrome.tsx");

  it("shows plan panel or honest no-plan guidance", () => {
    expect(page).toContain("PlanSupportCard");
    expect(page).toContain("NoPlanSupportCard");
    expect(page).toContain("Você só pagará depois de confirmar seu e-mail");
    expect(page).toContain("Plano depois do cadastro");
    expect(page).toContain("Renovação");
    expect(page).toContain("Cancelamento");
    expect(page).toContain("Stripe");
  });

  it("keeps terms and password UX on signup", () => {
    expect(form).toContain("Li e aceito");
    expect(form).toContain("Mostrar");
    expect(form).toContain('href="/termos"');
    expect(form).toContain('href="/privacidade"');
  });

  it("preserves tracking and mobile nav affordances", () => {
    expect(page).toContain("TrackingLink");
    expect(chrome).toContain("marketing-mobile-nav");
    expect(chrome).toContain("TrackingLink");
  });
});

describe("official Instagram handle", () => {
  it("defaults to amem.chat", () => {
    const original = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE;
    delete process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE;
    try {
      expect(getBrandConfig().socialHandles.instagram).toBe("amem.chat");
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE;
      else process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE = original;
    }
  });
});
