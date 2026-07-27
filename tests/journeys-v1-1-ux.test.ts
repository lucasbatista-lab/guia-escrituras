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
    expect(page).toContain("ensureJourneyStarted");
    expect(page).toContain("completedStepIds.includes");
    expect(page).toContain("completed={stepCompleted}");
    expect(page).toContain("nextStepHref");
    expect(page).toContain("isLastStep");
    expect(page).toContain("Voltar ao início");
    expect(page).toContain("Conversar sobre esta etapa");
  });

  it("complete button shows concluded state with next action and a11y live", () => {
    const button = read(
      "src",
      "components",
      "journeys",
      "journey-step-complete-button.tsx",
    );
    expect(button).toContain("Etapa concluída");
    expect(button).toContain("Jornada concluída");
    expect(button).toContain("journeyFinished");
    expect(button).toContain("Última etapa marcada");
    expect(button).toContain("Ver outras jornadas");
    expect(button).toContain("Próxima:");
    expect(button).toContain("Marcar como concluída");
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
    expect(page).toContain("journeyCompleted={progress.isCompleted}");
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
    expect(detail).toContain("Ver outras jornadas");
    expect(detail).toContain("Rever Jornada");
    expect(detail).toContain("completedAt");
    expect(detail).toContain("o progresso fica salvo");
  });

  it("step page uses Escritura / Reflexão / Ação hierarchy", () => {
    const page = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(page).toContain("Escritura");
    expect(page).toContain("Reflexão");
    expect(page).toContain("Ação prática");
    expect(page).toContain("Para conversar");
    expect(page).toContain("Conclusão da etapa");
    expect(page).toContain("Etapa ${step.number} de ${totalSteps}");
  });

  it("catalog cards use distinct accents and contextual CTAs", () => {
    const catalog = read("src", "app", "(platform)", "jornadas", "page.tsx");
    const display = read("src", "lib", "journeys", "display.ts");
    expect(display).toContain("getJourneyVisual");
    expect(display).toContain("Começar Jornada");
    expect(display).toContain("Continuar etapa");
    expect(display).toContain("Rever Jornada");
    expect(catalog).toContain("getJourneyVisual");
    expect(catalog).toContain("journeyDurationLabel");
    expect(catalog).toContain("journeyCurrentStepNumber");
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
