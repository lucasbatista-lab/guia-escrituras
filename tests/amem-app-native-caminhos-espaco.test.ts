import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canAccessJourneyStep,
  canUseReadingJourneys,
} from "@/lib/journeys/entitlement";
import { buildGuidedMoments } from "@/lib/journeys/guided/stages";
import { getAllJourneys } from "@/lib/journeys/registry";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("APP-NATIVE Caminhos guided moments", () => {
  it("stages existing editorial fields without inventing content", () => {
    for (const journey of getAllJourneys()) {
      for (const step of journey.steps) {
        const moments = buildGuidedMoments(step);
        expect(moments.map((m) => m.kind)).toEqual([
          "contexto",
          "escritura",
          "reflexao",
          "pratico",
          "oracao",
          "fecho",
        ]);
        expect(moments.some((m) => m.label === "Contexto")).toBe(true);
        expect(moments.some((m) => m.label === "Passagem")).toBe(true);
        expect(moments.some((m) => m.label === "Fecho · Levo")).toBe(true);
        expect(step.objective.length).toBeGreaterThan(10);
        expect(step.paraphrase.length).toBeGreaterThan(10);
      }
    }
  });

  it("Day renders guided client; completion only on last moment wiring", () => {
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
    expect(page).toContain("JourneyDayGuided");
    expect(page).toContain("SoftPaywallGate");
    expect(page).toMatch(/if \(!canAccessJourneyStep[\s\S]*SoftPaywallGate/);
    expect(page).not.toContain("sessionStorage");
    expect(guided).toContain("Continuar");
    expect(guided).toContain("JourneyStepCompleteButton");
    expect(guided).toContain('case "fecho"');
    expect(guided).toContain("ephemeral");
    expect(guided).not.toContain("sessionStorage");
    expect(guided).not.toContain("localStorage");
  });

  it("FREE/Essencial Day1 open; Day2+ blocked; Caminho/Profundo full", () => {
    expect(canAccessJourneyStep(null, 1)).toBe(true);
    expect(canAccessJourneyStep("essencial", 1)).toBe(true);
    expect(canAccessJourneyStep(null, 2)).toBe(false);
    expect(canAccessJourneyStep("essencial", 2)).toBe(false);
    expect(canAccessJourneyStep("caminho", 7)).toBe(true);
    expect(canAccessJourneyStep("profundo", 7)).toBe(true);
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
  });

  it("hub prioritizes Continuar/Começar over heavy syllabus", () => {
    const hub = read("src", "app", "(platform)", "jornadas", "[slug]", "page.tsx");
    expect(hub).toContain("Abrir Dia 1");
    expect(hub).toContain("min-h-12");
    expect(hub).toContain("canAccessJourneyStep");
    expect(hub).toContain("LockPill");
    expect(hub).not.toMatch(/grid-cols-3/);
  });
});

describe("APP-NATIVE Espaço intimate archive", () => {
  it("prayer is archive-first with sheet composer and overflow actions", () => {
    const prayer = read("src", "components", "workspace", "prayer-workspace.tsx");
    expect(prayer).toContain("IntimateSheet");
    expect(prayer).toMatch(/Nova oração/i);
    expect(prayer).toMatch(/respondida|answered/i);
    expect(prayer).toMatch(/Excluir|excluir/);
    expect(prayer).toContain("Confirmar exclusão");
    expect(prayer).toContain("/api/workspace/prayers");
    // No permanent top form as only surface — composer opens on demand.
    expect(prayer).toContain("composerOpen");
    expect(prayer).toContain("detailId");
  });

  it("journal create uses sheet; privacy copy preserved", () => {
    const journal = read(
      "src",
      "components",
      "workspace",
      "journal-workspace.tsx",
    );
    expect(journal).toContain("IntimateSheet");
    expect(journal).toMatch(/privado|privad/i);
    expect(journal).toMatch(/IA|analytics/i);
    expect(journal).toContain("/api/workspace/entries");
    expect(journal).toContain("composerOpen");
  });

  it("subnav stays archive areas with stable URLs", () => {
    const nav = read("src", "components", "workspace", "workspace-subnav.tsx");
    expect(nav).toContain("/espaco");
    expect(nav).toContain("/espaco/oracoes");
    expect(nav).toContain("/espaco/diario");
    expect(nav).toContain("/espaco/salvos");
    expect(nav).toContain("Memória");
  });

  it("hub Linha viva + empty V17 preserved", () => {
    const hub = read("src", "app", "(platform)", "espaco", "page.tsx");
    expect(hub).toContain("Linha viva");
    expect(hub).toContain("Este lugar vai guardar o que importa para você.");
    expect(hub).toContain("Primeira oração");
  });
});
