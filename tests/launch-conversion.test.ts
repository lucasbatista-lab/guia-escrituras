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
  const plans = read("src", "lib", "entitlements", "plans.ts");
  const stripeCheckout = read("src", "lib", "stripe", "checkout.ts");
  const chatService = read("src", "lib", "ai", "chat-service.ts");
  const adminMetrics = read("src", "lib", "admin", "metrics.ts");

  it("keeps brand tagline and emotional hero hierarchy", () => {
    expect(home).toContain("brand.name");
    expect(home).toContain("brand.tagline");
    expect(home).toContain("Quando a ansiedade aperta");
    expect(home).toContain("clareza");
    expect(home).toContain("Escrituras");
    expect(home).toContain("Não é Jesus");
    expect(home).toContain("revelação divina");
  });

  it("makes demo the primary cold-traffic CTA and conversion uses TrackingLink", () => {
    expect(home).toContain('href="#demonstracao"');
    expect(home).toContain("Ver uma reflexão de exemplo");
    expect(home).toContain("Começar com a minha situação");
    expect(home).toContain("Conhecer os planos");
    expect(home).toContain("TrackingLink");
    expect(home).toContain('href="/planos"');
    expect(home).toContain("R$ 38");
    // Primary CTA block appears before secondary conversion wording in hero CTAs
    const primaryIdx = home.indexOf("Ver uma reflexão de exemplo");
    const secondaryIdx = home.indexOf("Começar com a minha situação");
    expect(primaryIdx).toBeGreaterThan(-1);
    expect(secondaryIdx).toBeGreaterThan(primaryIdx);
  });

  it("places ChatDemo before plans and keeps trust anchors", () => {
    const demoIdx = home.indexOf("<ChatDemo");
    const plansIdx = home.indexOf("<PlanCards");
    expect(demoIdx).toBeGreaterThan(-1);
    expect(plansIdx).toBeGreaterThan(demoIdx);
    expect(home).toContain("Situações reais que você pode trazer");
    expect(home).toContain("Tenho contas vencendo");
    expect(home).toContain("Parece que Deus está em silêncio");
    expect(home).toContain("Como o Amém Chat transforma situação em reflexão");
    expect(home).toContain("Como começar");
    expect(home).toContain("Profundidades e tradições");
    expect(home).toContain("Segurança, privacidade e limites");
    expect(home).toContain("Estamos começando");
    expect(home).toContain("Stripe");
    expect(home).toContain("cancel");
  });

  it("does not invent social proof, scarcity or unavailable features", () => {
    const lowered = home.toLowerCase();
    expect(lowered).not.toMatch(/depoimento|testemunho/);
    expect(lowered).not.toMatch(/usuários ativos|milhares de/);
    expect(lowered).not.toMatch(/apenas hoje|últimas vagas|contagem regressiva/);
    expect(lowered).not.toMatch(/garantia de/);
    expect(lowered).not.toMatch(/whatsapp/);
    expect(lowered).not.toMatch(/respostas em áudio|respostas em audio/);
    expect(lowered).not.toMatch(/jornadas de leitura/);
  });

  it("ships local interactive demo without API or OpenAI calls", () => {
    expect(demo).toContain('"use client"');
    expect(demo).toContain("id=\"demonstracao\"");
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
