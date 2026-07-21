import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("premium value — journey continuity on inicio", () => {
  it("inicio card links to current step when available", () => {
    const card = read(
      "src",
      "components",
      "journeys",
      "journeys-inicio-card.tsx",
    );
    expect(card).toContain("currentStepId");
    expect(card).toContain("Próxima etapa");
    expect(card).toContain("Continuar:");
    expect(card).toContain("/jornadas/${inProgress.journey.slug}/${nextStep.slug}");
    expect(card).toContain("canUseReadingJourneys");
    expect(read("docs", "_ai", "AMEM_MINI_PRD_JOURNEY_CONTINUITY_INICIO_2026-07-21.md")).toContain(
      "Caminho",
    );
  });

  it("deepen copy states concrete value without theology overclaim", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("conexões bíblicas e próximos passos práticos");
    expect(panel).toContain("só nesta resposta");
    expect(panel).not.toMatch(/memória permanente|acesso superior/i);
    expect(panel).not.toMatch(/eu sou Jesus/i);
    expect(
      read("docs", "_ai", "AMEM_MINI_PRD_DEEPEN_VALUE_COPY_2026-07-21.md"),
    ).toContain("Profundo");
  });
});
