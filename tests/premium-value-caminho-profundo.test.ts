import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("premium value — journey continuity on inicio", () => {
  it("InicioLiving resumes Caminhos via journeyHref/current step wiring", () => {
    const page = read("src", "app", "(platform)", "inicio", "page.tsx");
    const living = read("src", "components", "inicio", "inicio-living.tsx");
    expect(page).toContain("pickMostRecentInProgressJourney");
    expect(page).toContain("currentStepId");
    expect(page).toContain("Continuar:");
    expect(page).toContain("/jornadas/${journey.slug}/${nextStep.slug}");
    expect(page).toContain("canUseReadingJourneys");
    expect(living).toContain("journeyHref");
    expect(living).toContain("Caminhos");
  });

  it("deepen copy states concrete value without theology overclaim", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("conexões bíblicas e próximos passos práticos");
    expect(panel).toContain("só nesta resposta");
    expect(panel).not.toMatch(/memória permanente|acesso superior/i);
    expect(panel).not.toMatch(/eu sou Jesus/i);
  });
});
