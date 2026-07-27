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
    expect(src).toContain("PREVIEW_COMPLETED");
    expect(src).toContain(" de {totalSteps} etapas");
    expect(src).toContain("progresso fica salvo");

    const step3 = ANSIEDADE_CONFIANCA_JOURNEY.steps.find((s) => s.number === 3);
    expect(step3?.title).toBeTruthy();
    expect(src).toContain("PREVIEW_STEP_NUMBER");
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
    expect(src).toContain("Tensões e perspectivas");
    expect(src).toContain("Análise de cenários");
    expect(src).toContain("Não é uma resposta gerada neste");
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
    expect(home.toLowerCase()).not.toMatch(/depoimento|testemunho|milhares de/);
    const cards = read("src", "components", "marketing", "plan-cards.tsx");
    expect(cards).toContain("Precisa de algo sob medida?");
  });
});
