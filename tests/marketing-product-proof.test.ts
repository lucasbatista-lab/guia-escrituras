import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ANSIEDADE_CONFIANCA_JOURNEY } from "@/lib/journeys/journeys/ansiedade-confianca";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("marketing product proof components", () => {
  it("journey preview uses real registry content without Supabase or client", () => {
    const src = read(
      "src",
      "components",
      "marketing",
      "journey-preview-static.tsx",
    );
    expect(src).not.toContain('"use client"');
    expect(src).not.toContain("supabase");
    expect(src).not.toContain("fetch(");
    expect(src).toContain("getJourneyBySlug");
    expect(src).toContain("ansiedade-confianca");
    expect(src).toContain("PREVIEW_COMPLETED = 2");
    expect(src).toContain("PREVIEW_STEP_NUMBER = 3");
    expect(src).toContain(" de {totalSteps} etapas");
    expect(src).toContain("progresso fica salvo");

    const step3 = ANSIEDADE_CONFIANCA_JOURNEY.steps.find((s) => s.number === 3);
    expect(step3?.title).toBeTruthy();
  });

  it("deepen comparison is a reviewed static example, not live AI", () => {
    const src = read(
      "src",
      "components",
      "marketing",
      "deepen-comparison-static.tsx",
    );
    expect(src).not.toContain('"use client"');
    expect(src).not.toContain("fetch(");
    expect(src).not.toContain("/api/chat");
    expect(src).toContain("Exemplo revisado de como o recurso funciona");
    expect(src).toContain(
      "Estou em conflito no trabalho e não sei se devo conversar agora ou esperar.",
    );
    expect(src).toContain("Tensões relevantes");
    expect(src).toContain("Contexto adicional");
    expect(src).toContain("Exemplo revisado de como o recurso funciona");
    expect(src).not.toContain("Análise de cenários");
    expect(src).not.toContain("Se X");
    expect(src).not.toContain("pode ser cancelado junto com a renovação");
    expect(src).toContain("renovação da assinatura pode ser");
    expect(src).toContain("cancelada na sua conta");
  });

  it("plan compare stays mobile-first without horizontal tables", () => {
    const src = read(
      "src",
      "components",
      "marketing",
      "plan-compare-static.tsx",
    );
    expect(src).not.toContain('"use client"');
    expect(src).not.toContain("<table");
    expect(src).toContain("<details");
    expect(src).toContain("min-h-11");
    expect(src).toContain("essencial");
    expect(src).toContain("caminho");
    expect(src).toContain("profundo");
    expect(src).toContain("hasActiveSubscription");
    expect(src).toContain("Gerenciar assinatura");
    expect(src).toContain("/conta");
  });

  it("home and planos mount both product proofs", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
    for (const page of [home, planos]) {
      expect(page).toContain("JourneyPreviewStatic");
      expect(page).toContain("DeepenComparisonStatic");
    }
    expect(planos).toContain("PlanCompareStatic");
    expect(planos).toContain("ParticularAccessNote");
    expect(planos).toContain("hasActiveSubscription={hasActiveSubscription}");
    expect(planos).toContain("Gerenciar assinatura");
    expect(home.toLowerCase()).not.toMatch(/depoimento|testemunho|milhares de/);
    const cards = read("src", "components", "marketing", "plan-cards.tsx");
    expect(cards).toContain("Precisa de algo sob medida?");
  });
});
