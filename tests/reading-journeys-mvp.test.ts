import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_ENTITLEMENT_KEYS,
  RESERVED_ENTITLEMENT_KEYS,
  getPlanByKey,
} from "@/lib/entitlements";
import { canUseReadingJourneys } from "@/lib/entitlements/reading-journeys";
import { buildJourneyStepChatPrefill } from "@/lib/journeys/chat-prefill";
import {
  getAllJourneys,
  getJourneyBySlug,
} from "@/lib/journeys/registry";
import {
  MemoryJourneyProgressRepository,
  createJourneyProgressService,
} from "@/lib/journeys/progress";
import { evaluateJourneyEditorialContent } from "@/lib/evals/theology/journey-content-eval";

vi.mock("@/lib/auth", () => ({ getAuthUserContext: vi.fn() }));

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("reading journeys registry", () => {
  it("has three journeys with seven steps each", () => {
    const journeys = getAllJourneys();
    expect(journeys).toHaveLength(3);
    for (const j of journeys) {
      expect(j.steps).toHaveLength(7);
      const slugs = new Set(j.steps.map((s) => s.slug));
      const ids = new Set(j.steps.map((s) => s.id));
      expect(slugs.size).toBe(7);
      expect(ids.size).toBe(7);
    }
  });

  it("passes editorial safety eval", () => {
    expect(evaluateJourneyEditorialContent().ok).toBe(true);
  });
});

describe("reading journeys entitlement", () => {
  it("allows caminho profundo particular only", () => {
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
    expect(canUseReadingJourneys("profundo")).toBe(true);
    expect(canUseReadingJourneys("particular")).toBe(true);
    expect(canUseReadingJourneys(null)).toBe(false);
  });

  it("reading_journeys is active not reserved", () => {
    expect(ACTIVE_ENTITLEMENT_KEYS.has("reading_journeys")).toBe(true);
    expect(RESERVED_ENTITLEMENT_KEYS.has("reading_journeys")).toBe(false);
  });
});

describe("reading journeys commercial copy", () => {
  it("lists jornadas on caminho not roadmap", () => {
    const caminho = getPlanByKey("caminho")!;
    expect(
      caminho.displayBenefits.some((b) => /jornadas de leitura/i.test(b)),
    ).toBe(true);
    expect(caminho.upcomingBenefits?.join(" ") ?? "").not.toMatch(
      /jornadas de leitura/i,
    );
    expect(read("src", "lib", "entitlements", "reserved.ts")).not.toMatch(
      /Jornadas de leitura guiadas/,
    );
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
    expect(getPlanByKey("profundo")?.priceMonthlyCents).toBe(18800);
  });
});

describe("reading journeys chat prefill", () => {
  it("builds allow-listed prefill only", () => {
    const journey = getAllJourneys()[0]!;
    const step = journey.steps[0]!;
    const prefill = buildJourneyStepChatPrefill(journey.slug, step.slug);
    expect(prefill).toMatch(/Quero refletir sobre a etapa/);
    expect(prefill).toMatch(step.title);
    expect(buildJourneyStepChatPrefill("evil", "inject")).toBeUndefined();
    expect(buildJourneyStepChatPrefill(journey.slug, "evil")).toBeUndefined();
  });

  it("conversar uses jornada etapa not raw tema for journeys", () => {
    const page = read("src", "app", "(platform)", "conversar", "page.tsx");
    expect(page).toContain("buildJourneyStepChatPrefill");
    expect(page).toContain("jornadaParam");
    expect(page).toContain("etapaParam");
  });
});

describe("reading journeys progress service", () => {
  const memory = new MemoryJourneyProgressRepository();
  const service = createJourneyProgressService(memory);

  afterEach(() => memory.clear());

  it("completes journey after seven steps idempotently", async () => {
    const journey = getJourneyBySlug("ansiedade-confianca")!;
    const ids = journey.steps.map((s) => s.id);
    for (const step of journey.steps) {
      await service.completeStep({
        userId: "u1",
        journeySlug: journey.slug,
        stepId: step.id,
        nextStepId: null,
        totalStepIds: ids,
      });
    }
    const state = await service.getState("u1", journey.slug);
    expect(state.isCompleted).toBe(true);
    expect(state.completedStepIds).toHaveLength(7);
    await service.completeStep({
      userId: "u1",
      journeySlug: journey.slug,
      stepId: ids[0]!,
      nextStepId: null,
      totalStepIds: ids,
    });
    const again = await service.getState("u1", journey.slug);
    expect(again.completedStepIds).toHaveLength(7);
  });
});

describe("reading journeys routes and nav", () => {
  it("exposes jornadas routes and legacy redirect", () => {
    expect(read("src", "app", "(platform)", "jornadas", "page.tsx")).toContain(
      "Jornadas de leitura",
    );
    expect(
      read("src", "app", "(platform)", "jornada", "page.tsx"),
    ).toContain('redirect("/jornadas")');
    expect(read("src", "lib", "journey", "journey-state.ts")).toContain(
      'href: "/jornadas"',
    );
    expect(read("src", "lib", "edge", "private-paths.ts")).toContain(
      "/jornadas",
    );
  });
});

describe("reading journeys export", () => {
  it("includes journeyProgress in export document", () => {
    const types = read("src", "lib", "account", "export-types.ts");
    const builder = read("src", "lib", "account", "export-user-data.ts");
    expect(types).toContain("journeyProgress");
    expect(builder).toContain("loadJourneyProgressForExport");
  });
});
