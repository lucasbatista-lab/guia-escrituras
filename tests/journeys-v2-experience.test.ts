import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import { buildJourneyStepChatPrefill } from "@/lib/journeys/chat-prefill";
import {
  journeyDayLabel,
  journeyIntro,
  journeyResumeHint,
  stepClosing,
  stepPrayer,
} from "@/lib/journeys/presentation";
import { getAllJourneys } from "@/lib/journeys/registry";
import { toJourneyProgressState } from "@/lib/journeys/progress/service";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("journeys V2 experience", () => {
  it("keeps Caminho+ entitlement and blocks Essencial", () => {
    expect(canUseReadingJourneys("essencial")).toBe(false);
    expect(canUseReadingJourneys("caminho")).toBe(true);
    expect(canUseReadingJourneys("profundo")).toBe(true);
    expect(canUseReadingJourneys(null)).toBe(false);
    const api = read("src", "lib", "journeys", "api-auth.ts");
    expect(api).toContain("canUseReadingJourneys(auth.planKey)");
  });

  it("presents intro, day label, prayer, closing without rewriting corpus", () => {
    const journey = getAllJourneys()[0]!;
    const step = journey.steps[0]!;
    expect(journeyIntro({ ...journey, intro: undefined }).toLowerCase()).toContain(
      "sete dias",
    );
    expect(journeyIntro(journey).length).toBeGreaterThan(20);
    expect(journeyDayLabel(3, 7)).toBe("Dia 3 de 7");
    expect(step.prayer).toBeTruthy();
    expect(step.closing).toBeTruthy();
    expect(stepPrayer(step)).toContain(step.bibleReference);
    expect(stepClosing(step).toLowerCase()).toContain("levo");
    expect(stepClosing(step).toLowerCase()).not.toContain("streak");
    expect(stepClosing(step)).not.toMatch(/você ficou \d+ dias/i);
    for (const j of getAllJourneys()) {
      expect(j.intro && j.intro.length > 20).toBe(true);
      for (const s of j.steps) {
        expect(s.prayer && s.prayer.length > 20, `${j.slug}/${s.slug}`).toBe(true);
        expect(s.closing && s.closing.toLowerCase().includes("levo"), `${j.slug}/${s.slug}`).toBe(true);
      }
    }
  });

  it("resume hint uses persisted progress, not sessionStorage", () => {
    const journey = getAllJourneys()[0]!;
    const first = journey.steps[0]!;
    const hint = journeyResumeHint(
      toJourneyProgressState(
        {
          userId: "u1",
          journeySlug: journey.slug,
          version: 1,
          completedStepIds: [first.id],
          currentStepId: journey.steps[1]!.id,
          startedAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-02T00:00:00.000Z",
          completedAt: null,
        },
        journey.slug,
      ),
      journey.steps,
    );
    expect(hint).toContain("dia 2");
    const stepPage = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(stepPage).not.toContain("sessionStorage");
    expect(stepPage).toContain("ensureJourneyStarted");
    expect(stepPage).toContain("Oração");
    expect(stepPage).toContain("Pergunta");
    const sql = read("supabase", "migrations", "20260712000008_journey_progress.sql");
    expect(sql).toContain("started_at");
    expect(sql).toContain("current_step_id");
    expect(sql).toContain("completed_step_ids");
    expect(sql).toContain("completed_at");
    expect(sql).toContain("auth.uid() = user_id");
  });

  it("chat prefill carries journey, day and reference without personal notes", () => {
    const journey = getAllJourneys()[0]!;
    const step = journey.steps[2]!;
    const prefill = buildJourneyStepChatPrefill(journey.slug, step.slug)!;
    expect(prefill).toContain(journey.title);
    expect(prefill).toContain(`dia ${step.number}`);
    expect(prefill).toContain(step.bibleReference);
    expect(prefill.toLowerCase()).not.toContain("anotação");
  });
});
