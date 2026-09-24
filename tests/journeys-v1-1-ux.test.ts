import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("journeys V1.1 step completion UX", () => {
  it("step page loads progress and passes completed into the button", () => {
    const page = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    const guided = read(
      "src",
      "components",
      "journeys",
      "journey-day-guided.tsx",
    );
    expect(page).toContain("ensureJourneyStarted");
    expect(page).toContain("completedStepIds.includes");
    expect(page).toContain("JourneyDayGuided");
    expect(page).toContain("stepCompleted={stepCompleted}");
    expect(page).toContain("nextStepHref");
    expect(page).toContain("isLastStep");
    expect(page).toContain("Voltar ao início");
    expect(page).toContain("Conversar sobre esta reflexão");
    expect(guided).toContain("completed={stepCompleted}");
    expect(guided).toContain("JourneyStepCompleteButton");
  });

  it("complete button shows concluded state with next action and a11y live", () => {
    const button = read(
      "src",
      "components",
      "journeys",
      "journey-step-complete-button.tsx",
    );
    expect(button).toContain("Dia concluído");
    expect(button).toContain("Caminho concluído");
    expect(button).toContain("journeyFinished");
    expect(button).toContain("Último dia marcado");
    expect(button).toContain("Ver outros caminhos");
    expect(button).toContain("Próximo:");
    expect(button).toContain("Concluir o dia");
    expect(button).toContain("setJustCompleted(true)");
    expect(button).toContain("data.progress?.completedAt");
  });

  it("step page passes real journeyCompleted, not only last-step position", () => {
    const page = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    const guided = read(
      "src",
      "components",
      "journeys",
      "journey-day-guided.tsx",
    );
    expect(page).toContain("journeyCompleted={progress.isCompleted}");
    expect(guided).toContain("journeyCompleted={journeyCompleted}");
  });

  it("completed journey detail offers catalog return", () => {
    const detail = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "page.tsx",
    );
    expect(detail).toContain("progress.isCompleted");
    expect(detail).toContain("Ver outros caminhos");
    expect(detail).toContain("Rever caminho");
    expect(detail).toContain("completedAt");
    expect(detail).toContain("o progresso fica salvo");
  });

  it("step page uses guided chapter hierarchy (contexto → fecho)", () => {
    const page = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(page).toContain("Contexto");
    expect(page).toContain("Passagem");
    expect(page).toContain("Reflexão");
    expect(page).toContain("Pergunta");
    expect(page).toContain("Oração");
    expect(page).toContain("Prática");
    expect(page).toContain("Fecho · Levo");
    expect(page).toContain("Para conversar");
    expect(page).toContain("journeyDayLabel");
    expect(page).not.toMatch(/streak|sequência de dias/i);
  });

  it("catalog cards use distinct accents and contextual CTAs", () => {
    const catalog = read("src", "app", "(platform)", "jornadas", "page.tsx");
    const catalogCard = read(
      "src",
      "components",
      "journeys",
      "journey-catalog-card.tsx",
    );
    const display = read("src", "lib", "journeys", "display.ts");
    expect(display).toContain("getJourneyVisual");
    expect(display).toContain("Começar caminho");
    expect(display).toContain("Continuar dia");
    expect(display).toContain("Rever caminho");
    expect(catalog).toContain("JourneyCatalogCard");
    expect(catalog).toContain("journeyCurrentStepNumber");
    expect(catalogCard).toContain("journeyDurationLabel");
    expect(catalogCard).toContain("journeyShortPromise");
  });

  it("reset button keeps explicit confirmation", () => {
    const reset = read(
      "src",
      "components",
      "journeys",
      "journey-reset-button.tsx",
    );
    expect(reset).toMatch(/confirm|Confirmar|certeza/i);
  });
});
