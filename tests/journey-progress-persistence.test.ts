import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createJourneyProgressService,
  mapJourneyProgressListForExport,
  MemoryJourneyProgressRepository,
  JourneyProgressError,
} from "@/lib/journeys/progress";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260712000008_journey_progress.sql",
);
const postcheckPath = join(
  root,
  "supabase",
  "postchecks",
  "20260712000008_journey_progress_postcheck.sql",
);

const TOTAL = [
  "step-1",
  "step-2",
  "step-3",
  "step-4",
  "step-5",
  "step-6",
  "step-7",
];

function ACTIVE_SET_SNIPPET(source: string): string {
  const match = source.match(
    /export const ACTIVE_ENTITLEMENT_KEYS = new Set<EntitlementKey>\(\[([\s\S]*?)\]\)/,
  );
  return match?.[1] ?? "";
}

describe("journey progress migration 008", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const postcheck = readFileSync(postcheckPath, "utf8");

  it("creates dedicated table with expected columns and constraints", () => {
    expect(sql).toContain("create table public.journey_progress");
    expect(sql).toContain("user_id uuid not null references public.profiles");
    expect(sql).toContain("on delete cascade");
    expect(sql).toContain("journey_slug text not null");
    expect(sql).toContain("completed_step_ids text[] not null default");
    expect(sql).toContain("primary key (user_id, journey_slug)");
    expect(sql).not.toContain("spiritual_profiles");
    expect(sql).not.toMatch(/check\s*\(\s*journey_slug\s+in/i);
  });

  it("enables RLS with own-row select/insert/update and no delete policy", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("journey_progress_select_own");
    expect(sql).toContain("journey_progress_insert_own");
    expect(sql).toContain("journey_progress_update_own");
    expect(sql).not.toContain("journey_progress_delete_own");
    expect(sql).toContain("auth.uid() = user_id");
  });

  it("reuses set_updated_at and ships atomic RPCs", () => {
    expect(sql).toContain("execute function public.set_updated_at()");
    expect(sql).toContain("complete_journey_progress_step");
    expect(sql).toContain("start_journey_progress");
    expect(sql).toContain("reset_journey_progress");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("grant execute");
    expect(sql).toContain("to service_role");
  });

  it("documents postcheck and forbids auto-apply wording", () => {
    expect(sql).toContain("DO NOT apply until human review");
    expect(postcheck).toContain("READ ONLY");
    expect(postcheck).toContain("rls_enabled");
    expect(postcheck).toContain("policies_ok");
  });
});

describe("journey progress service + memory repository", () => {
  const memory = new MemoryJourneyProgressRepository();
  const service = createJourneyProgressService(memory);

  afterEach(() => {
    memory.clear();
  });

  it("starts empty and lists nothing", async () => {
    const state = await service.getState("user-a", "ansiedade-confianca");
    expect(state.isStarted).toBe(false);
    expect(state.completedStepIds).toEqual([]);
    expect(await service.listStates("user-a")).toEqual([]);
  });

  it("starts a journey idempotently", async () => {
    const first = await service.start({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      firstStepId: "step-1",
    });
    const second = await service.start({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      firstStepId: "step-1",
    });
    expect(first.completedStepIds).toEqual([]);
    expect(second.completedStepIds).toEqual([]);
    expect(first.currentStepId).toBe("step-1");
  });

  it("completes steps with idempotency and out-of-order support", async () => {
    await service.start({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      firstStepId: "step-1",
    });
    await service.completeStep({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      stepId: "step-3",
      nextStepId: "step-4",
      totalStepIds: TOTAL,
    });
    const again = await service.completeStep({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      stepId: "step-3",
      nextStepId: "step-4",
      totalStepIds: TOTAL,
    });
    expect(again.completedStepIds).toEqual(["step-3"]);
    expect(again.completedAt).toBeNull();
  });

  it("marks journey completed when all expected steps are present", async () => {
    for (const stepId of TOTAL) {
      await service.completeStep({
        userId: "user-a",
        journeySlug: "ansiedade-confianca",
        stepId,
        nextStepId: null,
        totalStepIds: TOTAL,
      });
    }
    const state = await service.getState("user-a", "ansiedade-confianca");
    expect(state.isCompleted).toBe(true);
    expect(state.completedStepIds).toHaveLength(7);
    expect(state.completedAt).toBeTruthy();
  });

  it("resets progress without leaking to another user", async () => {
    await service.completeStep({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      stepId: "step-1",
      nextStepId: "step-2",
      totalStepIds: TOTAL,
    });
    await service.completeStep({
      userId: "user-b",
      journeySlug: "ansiedade-confianca",
      stepId: "step-1",
      nextStepId: "step-2",
      totalStepIds: TOTAL,
    });
    await service.reset({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
    });
    expect(
      (await service.getState("user-a", "ansiedade-confianca")).completedStepIds,
    ).toEqual([]);
    expect(
      (await service.getState("user-b", "ansiedade-confianca")).completedStepIds,
    ).toEqual(["step-1"]);
  });

  it("rejects invalid structural input", async () => {
    await expect(
      service.completeStep({
        userId: "user-a",
        journeySlug: "ansiedade-confianca",
        stepId: "unknown",
        nextStepId: null,
        totalStepIds: TOTAL,
      }),
    ).rejects.toBeInstanceOf(JourneyProgressError);

    await expect(
      service.completeStep({
        userId: "user-a",
        journeySlug: "ansiedade-confianca",
        stepId: "step-1",
        nextStepId: null,
        totalStepIds: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("lists journeys ordered by slug", async () => {
    await service.start({
      userId: "user-a",
      journeySlug: "recomeco-proposito",
      firstStepId: "a",
    });
    await service.start({
      userId: "user-a",
      journeySlug: "ansiedade-confianca",
      firstStepId: "a",
    });
    const list = await service.listStates("user-a");
    expect(list.map((j) => j.journeySlug)).toEqual([
      "ansiedade-confianca",
      "recomeco-proposito",
    ]);
  });

  it("simulates concurrent completes without losing either step", async () => {
    await Promise.all([
      service.completeStep({
        userId: "user-a",
        journeySlug: "ansiedade-confianca",
        stepId: "step-1",
        nextStepId: "step-2",
        totalStepIds: TOTAL,
      }),
      service.completeStep({
        userId: "user-a",
        journeySlug: "ansiedade-confianca",
        stepId: "step-2",
        nextStepId: "step-3",
        totalStepIds: TOTAL,
      }),
    ]);
    const state = await service.getState("user-a", "ansiedade-confianca");
    expect(state.completedStepIds.sort()).toEqual(["step-1", "step-2"]);
  });
});

describe("journey progress export mapper (prepared, not live)", () => {
  it("maps progress without conversation or personal text fields", () => {
    const mapped = mapJourneyProgressListForExport([
      {
        userId: "user-a",
        journeySlug: "ansiedade-confianca",
        version: 1,
        completedStepIds: ["step-1"],
        currentStepId: "step-2",
        startedAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T01:00:00.000Z",
        completedAt: null,
      },
    ]);
    expect(mapped).toEqual([
      {
        journeySlug: "ansiedade-confianca",
        version: 1,
        completedStepIds: ["step-1"],
        currentStepId: "step-2",
        startedAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T01:00:00.000Z",
        completedAt: null,
      },
    ]);
    const json = JSON.stringify(mapped);
    expect(json).not.toMatch(/content|prompt|reflection|message/i);
  });

  it("returns empty array when there is no progress", () => {
    expect(mapJourneyProgressListForExport([])).toEqual([]);
  });
});

describe("production isolation — foundation must not query the table live", () => {
  it("export route and builder do not reference journey_progress", () => {
    const exportRoute = readFileSync(
      join(root, "src", "app", "api", "account", "export", "route.ts"),
      "utf8",
    );
    const exportBuilder = readFileSync(
      join(root, "src", "lib", "account", "export-user-data.ts"),
      "utf8",
    );
    const exportTypes = readFileSync(
      join(root, "src", "lib", "account", "export-types.ts"),
      "utf8",
    );
    expect(exportRoute).not.toContain("journey_progress");
    expect(exportBuilder).not.toContain("journey_progress");
    expect(exportBuilder).not.toContain("getJourneyProgressRepository");
    expect(exportTypes).not.toContain("journeyProgress");
    expect(exportTypes).toContain("amem-chat-user-data-v1");
  });

  it("does not activate reading_journeys or public journey routes", () => {
    const reserved = readFileSync(
      join(root, "src", "lib", "entitlements", "reserved.ts"),
      "utf8",
    );
    expect(reserved).toContain('"reading_journeys"');
    expect(reserved).toContain("RESERVED_ENTITLEMENT_KEYS");
    expect(ACTIVE_SET_SNIPPET(reserved)).not.toContain("reading_journeys");
    expect(ACTIVE_SET_SNIPPET(reserved)).toContain("chat_standard");
    expect(ACTIVE_SET_SNIPPET(reserved)).toContain("chat_deep");

    const jornadaPage = readFileSync(
      join(root, "src", "app", "(platform)", "jornada", "page.tsx"),
      "utf8",
    );
    expect(jornadaPage).toContain("Em breve");
  });
});
