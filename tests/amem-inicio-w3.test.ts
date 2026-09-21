
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W3 / Wave 3A living /inicio V17", () => {
  it("free and paid composition use InicioLiving (not card soup)", () => {
    const page = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(page).toContain("InicioLiving");
    expect(page).toMatch(/confirmed_without_plan[\s\S]*InicioLiving/);
    expect(page).toMatch(/allowsChat=\{allowsChat\}[\s\S]*InicioLiving|InicioLiving[\s\S]*allowsChat=\{allowsChat\}/);
  });

  it("living home is dusk-first with Espaço/Caminhos teasers and no entitlement leak", () => {
    const living = read("src", "components", "inicio", "inicio-living.tsx");
    expect(living).toContain("amem-surface-dusk");
    expect(living).toContain("amem-surface-poco");
    expect(living).toContain("loadRecentMemory");
    expect(living).toContain('href="/espaco"');
    expect(living).toContain('href="/hoje"');
    expect(living).toContain("Entrar no Hoje");
    expect(living).toContain("Caminhos");
    expect(living).toContain("PlanChip");
    expect(living).toContain("Grátis");
    expect(living).not.toMatch(/streak|confetti|dias seguidos/i);
  });

  it("empty memory is editorial and points to Hoje", () => {
    const strip = read("src", "components", "inicio", "memory-strip.tsx");
    expect(strip).toContain("loadRecentMemory");
    expect(strip).toContain("Ainda em branco");
    expect(strip).toContain('href="/hoje"');
    expect(strip).not.toMatch(/mock|fake|lorem/i);
  });

  it("optional check-in posts without inventing paid access", () => {
    const checkin = read(
      "src",
      "components",
      "inicio",
      "inicio-checkin-strip.tsx",
    );
    expect(checkin).toContain("/api/daily/interaction");
    expect(checkin).toContain("aria-pressed");
    expect(checkin).not.toContain("/conversar");
    expect(checkin).not.toContain("openai");
  });
});
