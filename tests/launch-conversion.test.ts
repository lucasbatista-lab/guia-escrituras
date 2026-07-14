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

  it("keeps brand, tagline and conversion CTAs without legal overload in hero", () => {
    expect(home).toContain("brand.name");
    expect(home).toContain("brand.tagline");
    expect(home).toContain("Escolher meu plano");
    expect(home).toContain("#demonstracao");
    expect(home).toContain("Ver uma reflexão de exemplo");
    expect(home).toContain("Stripe");
    expect(home).toContain("cancel");
  });

  it("includes essential conversion sections", () => {
    expect(home).toContain("Situações em que o Amém Chat pode ajudar");
    expect(home).toContain("Como começar");
    expect(home).toContain("Benefícios disponíveis hoje");
    expect(home).toContain("Tradições");
    expect(home).toContain("Transparência e segurança");
    expect(home).toContain("Planos");
    expect(home).toContain("Perguntas frequentes");
  });

  it("does not sell unavailable capabilities as active", () => {
    const lowered = home.toLowerCase();
    expect(lowered).not.toMatch(/whatsapp/);
    expect(lowered).not.toMatch(/respostas em áudio|respostas em audio/);
    expect(lowered).not.toMatch(/jornadas de leitura/);
    expect(lowered).not.toMatch(/depoimento|testemunho/);
    expect(lowered).not.toMatch(/usuários ativos|milhares de/);
    expect(lowered).not.toMatch(/apenas hoje|últimas vagas|contagem regressiva/);
  });

  it("ships local interactive demo without API calls", () => {
    expect(demo).toContain('"use client"');
    expect(demo).toContain("Ansiedade");
    expect(demo).toContain("Decisões");
    expect(demo).toContain("Família");
    expect(demo).toContain("Perdão");
    expect(demo).toContain("Recomeços");
    expect(demo).toContain("Sem chamada à API");
    expect(demo).not.toContain("fetch(");
    expect(demo).not.toContain("/api/chat");
    expect(demo).toContain('href="/planos"');
    expect(demo).toContain("Escolher meu plano");
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
