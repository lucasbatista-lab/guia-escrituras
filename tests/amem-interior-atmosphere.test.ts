import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getJourneyAtmosphere,
  getStageAtmosphere,
  journeyAtmosphereStyle,
  isKnownJourneySlug,
} from "@/lib/journeys/guided/atmosphere";
import { buildGuidedMoments } from "@/lib/journeys/guided/stages";
import { getAllJourneys } from "@/lib/journeys/registry";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("interior atmosphere — journey DNA", () => {
  it("DNA helper is deterministic per known slug", () => {
    const a = getJourneyAtmosphere("ansiedade-confianca");
    const b = getJourneyAtmosphere("ansiedade-confianca");
    expect(a).toEqual(b);
    expect(a.motif).toBe("horizon");
    expect(getJourneyAtmosphere("perdao-limites").motif).toBe("edge");
    expect(getJourneyAtmosphere("recomeco-proposito").motif).toBe("path");
    expect(isKnownJourneySlug("ansiedade-confianca")).toBe(true);
    expect(isKnownJourneySlug("nope")).toBe(false);
    const style = journeyAtmosphereStyle("perdao-limites");
    expect(style["--journey-highlight"]).toBeTruthy();
    expect(style["--journey-wash"]).toBeTruthy();
  });

  it("stage profiles differ in composition language", () => {
    expect(getStageAtmosphere("contexto").composition).toBe("enter");
    expect(getStageAtmosphere("escritura").composition).toBe("type");
    expect(getStageAtmosphere("reflexao").composition).toBe("insight");
    expect(getStageAtmosphere("pratico").composition).toBe("action");
    expect(getStageAtmosphere("oracao").composition).toBe("prayer");
    expect(getStageAtmosphere("fecho").composition).toBe("close");
    expect(getStageAtmosphere("contexto").showFragment).toBe(true);
    expect(getStageAtmosphere("escritura").showFragment).toBe(false);
    expect(getStageAtmosphere("fecho").showFragment).toBe(true);
  });

  it("Day carries atmosphere + SoftSwap; cover supports fragment/motif", () => {
    const guided = read(
      "src",
      "components",
      "journeys",
      "journey-day-guided.tsx",
    );
    const cover = read(
      "src",
      "components",
      "journeys",
      "covers",
      "journey-cover-art.tsx",
    );
    const atmo = read(
      "src",
      "components",
      "journeys",
      "covers",
      "journey-visual-atmosphere.tsx",
    );
    expect(guided).toContain("JourneyVisualAtmosphere");
    expect(guided).toContain("journeyAtmosphereStyle");
    expect(guided).toContain("SoftSwap");
    expect(guided).toContain("Continuar");
    expect(guided).toContain("amem-stage-motif");
    expect(guided).not.toContain("sessionStorage");
    expect(cover).toContain('variant === "fragment"');
    expect(cover).toContain('variant === "motif"');
    expect(cover).toContain("JourneyArtFragment");
    expect(atmo).toContain("JourneyArtFragment");
    expect(atmo).toContain("JourneyArtMotif");
  });

  it("guided moments still map editorial fields only", () => {
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
      }
    }
  });
});

describe("interior atmosphere — espaço archive states", () => {
  it("prayer separates list / composer / detail without list overflow chrome", () => {
    const prayer = read("src", "components", "workspace", "prayer-workspace.tsx");
    expect(prayer).toContain("composerOpen");
    expect(prayer).toContain("detailId");
    expect(prayer).toContain("amem-archive-timeline");
    expect(prayer).toContain("IntimateSheet");
    expect(prayer).toContain("Marcar como respondida");
    expect(prayer).toContain("Confirmar exclusão");
    expect(prayer).toContain("/api/workspace/prayers");
    // Overflow actions live in detail, not permanent list ··· chrome
    expect(prayer).not.toContain("Mais ações");
    expect(prayer).not.toMatch(/aria-label="Mais ações"/);
  });

  it("journal keeps create/detail/delete APIs with archive grouping", () => {
    const journal = read(
      "src",
      "components",
      "workspace",
      "journal-workspace.tsx",
    );
    expect(journal).toContain("amem-archive-timeline");
    expect(journal).toContain("composerOpen");
    expect(journal).toContain("/api/workspace/entries");
    expect(journal).toMatch(/privado|privad/i);
    expect(journal).toMatch(/IA|analytics/i);
  });
});

describe("interior atmosphere — hoje complete hierarchy", () => {
  it("COMPLETE has one primary Conversar; back is not a competing CTA", () => {
    const ritual = read("src", "components", "daily", "hoje-ritual.tsx");
    const completeIdx = ritual.indexOf('data-hoje-phase="complete"');
    const complete = ritual.slice(completeIdx);
    expect(complete).toContain('variant="ritual"');
    expect(complete).toContain("Conversar sobre isso");
    expect(complete).toContain("Compartilhar");
    expect(complete).toContain("Voltar ao Início");
    expect(complete).toContain('href="/inicio"');
    const conversarRitual = complete.indexOf('variant="ritual"');
    const voltar = complete.indexOf("Voltar ao Início");
    expect(voltar).toBeGreaterThan(conversarRitual);
    // Back is a text Link, not a full-width ritual/outline Button
    const voltarSlice = complete.slice(
      Math.max(0, voltar - 320),
      voltar + 40,
    );
    expect(voltarSlice).toContain("<Link");
    expect(voltarSlice).not.toContain('variant="ritual"');
  });
});
