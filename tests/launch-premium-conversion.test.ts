import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatCancelingWithAccessMetric } from "@/lib/admin/format-canceling-metric";
import { getSupportEmail } from "@/config/legal";
import { getPlanByKey } from "@/lib/entitlements";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("launch premium conversion", () => {
  it("home hero keeps primary CTA, starting price and trust microcopy", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    expect(home).toContain("brand.tagline");
    expect(home).toContain("Começar com a minha situação");
    expect(home).toContain("Ver uma reflexão de exemplo");
    expect(home).toContain("ESSENCIAL_PRICE_LABEL");
    expect(home).toContain("Planos a partir de");
    expect(home).toContain("R$ 38");
    expect(home).toContain("Pagamento seguro");
    expect(home).toContain("Cancele quando quiser");
    expect(home).toContain("Tradição ecumênica, evangélica ou católica");
    expect(home).toContain("inteligência artificial");
    const hero = home.slice(0, home.indexOf('id="demo-heading"'));
    expect(hero).toContain("Não é Jesus");
    expect(hero).not.toMatch(/Não afirma ser Jesus/);
    expect(home.toLowerCase()).not.toMatch(/depoimento|testemunho|milhares de/);
  });

  it("demo stays local with visible references and no API", () => {
    const demo = read("src", "components", "marketing", "chat-demo.tsx");
    expect(demo).toContain("Sem chamada à API");
    expect(demo).toContain("Referências ·");
    expect(demo).toContain("exemplo local");
    expect(demo).not.toContain("fetch(");
    expect(demo).not.toContain("/api/chat");
    expect(demo).toContain('href="/planos"');
  });

  it("plans stay honest with concrete CTAs and no upcoming in primary benefits", () => {
    const essencial = getPlanByKey("essencial");
    const caminho = getPlanByKey("caminho");
    const profundo = getPlanByKey("profundo");
    expect(essencial?.priceMonthlyCents).toBe(3800);
    expect(caminho?.highlighted).toBe(true);
    expect(caminho?.ctaLabel).toBe("Escolher o Caminho");
    expect(profundo?.displayBenefits.join(" ")).toMatch(/aprofundar/i);
    expect(profundo?.displayBenefits.join(" ").toLowerCase()).not.toMatch(
      /whatsapp|áudio|audio|jornadas de leitura|conversas profundas|suporte prioritário/,
    );
    const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
    expect(planos).toContain("comparar-uso");
    expect(planos).toContain("Stripe");
  });

  it("purchase journey progress is standardized across funnel pages", () => {
    const stepper = read(
      "src",
      "components",
      "marketing",
      "purchase-journey-steps.tsx",
    );
    expect(stepper).toContain("Plano");
    expect(stepper).toContain("Conta");
    expect(stepper).toContain("Pagamento");
    expect(stepper).toContain("Personalização");
    expect(stepper).toContain("Primeira reflexão");

    for (const parts of [
      ["src", "app", "(auth)", "cadastro", "page.tsx"],
      ["src", "app", "(auth)", "confira-seu-email", "page.tsx"],
      ["src", "app", "(auth)", "email-confirmado", "page.tsx"],
      ["src", "app", "(platform)", "assinar", "continuar", "page.tsx"],
      ["src", "app", "(platform)", "personalizar", "page.tsx"],
      ["src", "app", "(platform)", "assinatura", "sucesso", "page.tsx"],
    ]) {
      expect(read(...parts)).toContain("PurchaseJourneySteps");
    }
  });

  it("first paid entry and support address are clear", () => {
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(inicio).toContain("O que está pesando hoje?");
    expect(inicio).toContain("Escrever minha situação");
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    delete process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL;
    expect(getSupportEmail()).toBe("amemchatbr@gmail.com");
  });

  it("canceling metric never shows zero when Stripe lookup fails", () => {
    expect(formatCancelingWithAccessMetric(null)).toBe(
      "Indisponível no momento",
    );
    expect(formatCancelingWithAccessMetric(undefined)).toBe(
      "Indisponível no momento",
    );
    expect(formatCancelingWithAccessMetric(0)).toBe("0");
    expect(formatCancelingWithAccessMetric(3)).toBe("3");

    const metrics = read("src", "lib", "admin", "metrics.ts");
    expect(metrics).toContain("cancelingWithAccessCount: number | null");
    expect(metrics).toContain("return null");
    const adminPage = read("src", "app", "admin", "page.tsx");
    expect(adminPage).toContain("formatCancelingWithAccessMetric");
    expect(adminPage).toContain("Consulta à Stripe indisponível");
  });

  it("preserves CSP and security headers configuration", () => {
    const config = read("next.config.ts");
    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("https://*.supabase.co");
    expect(config).not.toContain("http://");
  });
});
