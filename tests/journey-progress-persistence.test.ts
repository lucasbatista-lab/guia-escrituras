import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ACTIVE_ENTITLEMENT_KEYS,
  RESERVED_ENTITLEMENT_KEYS,
} from "@/lib/entitlements/reserved";
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
const migration009Path = join(
  root,
  "supabase",
  "migrations",
  "20260712000009_journey_progress_anonymous_access_hardening.sql",
);
const postcheckPath = join(
  root,
  "supabase",
  "postchecks",
  "20260712000008_journey_progress_postcheck.sql",
);
const postcheckConsolidatedPath = join(
  root,
  "supabase",
  "postchecks",
  "20260712000008_journey_progress_postcheck_consolidated.sql",
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

describe("journey progress migration 009 anonymous access hardening", () => {
  const sql008 = readFileSync(migrationPath, "utf8");
  const sql009 = readFileSync(migration009Path, "utf8");
  const consolidated = readFileSync(postcheckConsolidatedPath, "utf8");

  it("revokes all table privileges from anon and public", () => {
    expect(sql009).toMatch(
      /revoke\s+all\s+on\s+table\s+public\.journey_progress\s+from\s+anon/i,
    );
    expect(sql009).toMatch(
      /revoke\s+all\s+on\s+table\s+public\.journey_progress\s+from\s+public/i,
    );
  });

  it("revokes EXECUTE on the three RPCs from anon and public", () => {
    for (const fn of [
      "start_journey_progress(uuid, text, text)",
      "complete_journey_progress_step(uuid, text, text, text, text[])",
      "reset_journey_progress(uuid, text)",
    ]) {
      expect(sql009).toMatch(
        new RegExp(
          `revoke\\s+all\\s+on\\s+function\\s+public\\.${fn.replace(
            /[()[\]]/g,
            "\\$&",
          )}\\s+from\\s+public`,
          "i",
        ),
      );
      expect(sql009).toMatch(
        new RegExp(
          `revoke\\s+all\\s+on\\s+function\\s+public\\.${fn.replace(
            /[()[\]]/g,
            "\\$&",
          )}\\s+from\\s+anon`,
          "i",
        ),
      );
    }
  });

  it("preserves EXECUTE for authenticated and service_role without authenticated DELETE", () => {
    expect(sql009).toMatch(
      /grant\s+select,\s*insert,\s*update\s+on\s+table\s+public\.journey_progress\s+to\s+authenticated/i,
    );
    expect(sql009).toMatch(
      /grant\s+select,\s*insert,\s*update\s+on\s+table\s+public\.journey_progress\s+to\s+service_role/i,
    );
    expect(sql009).not.toMatch(
      /grant\s+[^;]*\bdelete\b[^;]*to\s+authenticated/i,
    );
    expect(sql009).toContain(
      "grant execute on function public.start_journey_progress(uuid, text, text) to authenticated",
    );
    expect(sql009).toContain(
      "grant execute on function public.start_journey_progress(uuid, text, text) to service_role",
    );
    expect(sql009).toContain(
      "grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to authenticated",
    );
    expect(sql009).toContain(
      "grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to service_role",
    );
    expect(sql009).toContain(
      "grant execute on function public.reset_journey_progress(uuid, text) to authenticated",
    );
    expect(sql009).toContain(
      "grant execute on function public.reset_journey_progress(uuid, text) to service_role",
    );
  });

  it("does not introduce SECURITY DEFINER or rewrite RPC bodies", () => {
    expect(sql009).not.toMatch(/security\s+definer/i);
    expect(sql009).not.toMatch(/create\s+or\s+replace\s+function/i);
    expect(sql009).not.toContain("completed_step_ids");
  });

  it("does not edit migration 008", () => {
    expect(sql008).toContain("create table public.journey_progress");
    expect(sql008).toContain("security invoker");
    expect(sql009).not.toContain("create table public.journey_progress");
  });

  it("updates consolidated postcheck with separate anon and PUBLIC checks in overall_ok", () => {
    expect(consolidated).toContain("anon_table_privileges_blocked");
    expect(consolidated).toContain("anon_table_explicit_grants_absent");
    expect(consolidated).toContain("public_table_privileges_absent");
    expect(consolidated).toContain("anon_rpc_execute_blocked");
    expect(consolidated).toContain("public_rpc_execute_absent");
    expect(consolidated).toContain("has_function_privilege");
    expect(consolidated).toContain("'anon'");
    expect(consolidated).toContain("a.grantee = 0");
    expect(consolidated).not.toMatch(
      /has_(?:table|function)_privilege\(\s*'PUBLIC'/i,
    );
    expect(consolidated).not.toMatch(
      /has_(?:table|function)_privilege\(\s*'public'\s*,/i,
    );
    expect(consolidated).toMatch(
      /and\s+ate\.anon_table_privileges_blocked[\s\S]*and\s+are\.anon_rpc_execute_blocked[\s\S]*as\s+overall_ok/,
    );
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
        status: "in_progress",
      },
    ]);
    const json = JSON.stringify(mapped);
    expect(json).not.toMatch(/content|prompt|reflection|message/i);
  });

  it("returns empty array when there is no progress", () => {
    expect(mapJourneyProgressListForExport([])).toEqual([]);
  });
});

describe("production export includes journey progress", () => {
  it("wires journeyProgress into owner export", () => {
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
    expect(exportBuilder).toContain("getJourneyProgressRepository");
    expect(exportTypes).toContain("journeyProgress");
    expect(exportRoute).toContain("buildUserDataExport");
    expect(exportTypes).toContain("amem-chat-user-data-v1");
  });

  it("activates reading_journeys and public journey routes", () => {
    expect(ACTIVE_ENTITLEMENT_KEYS.has("reading_journeys")).toBe(true);
    expect(RESERVED_ENTITLEMENT_KEYS.has("reading_journeys")).toBe(false);

    const jornadaPage = readFileSync(
      join(root, "src", "app", "(platform)", "jornada", "page.tsx"),
      "utf8",
    );
    expect(jornadaPage).toContain('redirect("/jornadas")');
  });
});
