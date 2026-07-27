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
import { mapJourneyCompleteError } from "@/lib/journeys/complete-client-errors";
import { toClientError } from "@/lib/safety";

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
const migration010Path = join(
  root,
  "supabase",
  "migrations",
  "20260712000010_journey_progress_complete_rpc_unnest_fix.sql",
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
const postcheck010Path = join(
  root,
  "supabase",
  "postchecks",
  "20260712000010_journey_progress_complete_rpc_unnest_fix_postcheck.sql",
);
const migration011Path = join(
  root,
  "supabase",
  "migrations",
  "20260712000011_journey_progress_role_least_privilege.sql",
);
const postcheck011Path = join(
  root,
  "supabase",
  "postchecks",
  "20260712000011_journey_progress_role_least_privilege_postcheck.sql",
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

describe("journey progress migration 010 complete RPC unnest fix (PG 42883)", () => {
  const sql008 = readFileSync(migrationPath, "utf8");
  const sql010 = readFileSync(migration010Path, "utf8");
  const postcheck010 = readFileSync(postcheck010Path, "utf8");

  /** Bare unnest table-alias used as scalar — proven PG 42883 vector in MIG 008. */
  const bareUnnestAliasMisuse = [
    /unnest\([^)]*\)\s+as\s+e\b/i,
    /unnest\([^)]*\)\s+as\s+x\b/i,
    /trim\(\s*e\s*\)/i,
    /char_length\(\s*x\s*\)/i,
    /bool_and\(\s*e\s*=/i,
    /array_agg\(\s*distinct\s+x\b/i,
  ];

  it("documents that MIG 008 still contains the historical bare-alias anti-pattern", () => {
    // 008 is immutable history — contract detects the bug class, 010 repairs it.
    expect(sql008).toMatch(/unnest\([^)]*\)\s+as\s+e\b/i);
    expect(sql008).toMatch(/trim\(\s*e\s*\)/i);
    expect(sql008).toMatch(/unnest\([^)]*\)\s+as\s+x\b/i);
  });

  it("replaces only complete_journey_progress_step with explicit unnest column aliases", () => {
    expect(sql010).toContain(
      "create or replace function public.complete_journey_progress_step",
    );
    expect(sql010).toContain("security invoker");
    expect(sql010).toContain("set search_path = public");
    expect(sql010).toContain("as item(step_id)");
    expect(sql010).toContain("as exp(step_id)");
    expect(sql010).toContain("item.step_id");
    expect(sql010).toContain("exp.step_id");
    expect(sql010).not.toContain("create table public.journey_progress");
    expect(sql010).not.toMatch(/security\s+definer/i);
    expect(sql010).not.toContain("start_journey_progress(");
    expect(sql010).not.toContain("reset_journey_progress(");
  });

  it("removes bare unnest alias scalar misuse from the repaired function body", () => {
    const bodyMatch = sql010.match(/as\s+\$\$([\s\S]*?)\$\$;/i);
    expect(bodyMatch?.[1]).toBeTruthy();
    const body = bodyMatch![1]!;
    for (const pattern of bareUnnestAliasMisuse) {
      expect(body, String(pattern)).not.toMatch(pattern);
    }
  });

  it("reaffirms anon/PUBLIC revoke and authenticated/service_role EXECUTE", () => {
    expect(sql010).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.complete_journey_progress_step\(uuid, text, text, text, text\[\]\)\s+from\s+public/i,
    );
    expect(sql010).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.complete_journey_progress_step\(uuid, text, text, text, text\[\]\)\s+from\s+anon/i,
    );
    expect(sql010).toContain(
      "grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to authenticated",
    );
    expect(sql010).toContain(
      "grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to service_role",
    );
    expect(sql010).toMatch(
      /revoke\s+all\s+on\s+table\s+public\.journey_progress\s+from\s+anon/i,
    );
  });

  it("ships read-only postcheck proving fix markers and grants", () => {
    expect(postcheck010).toContain("READ ONLY");
    expect(postcheck010).toContain("overall_ok");
    expect(postcheck010).toContain("fixed_unnest_aliases_present");
    expect(postcheck010).toContain("invalid_bare_unnest_alias_absent");
    expect(postcheck010).toContain("security_invoker");
    expect(postcheck010).toContain("policies_intact");
    expect(postcheck010).toContain("Does not mutate data");
  });

  it("locates the RPC via to_regprocedure so named identity args cannot empty fn", () => {
    expect(postcheck010).toMatch(
      /to_regprocedure\(\s*'public\.complete_journey_progress_step\(uuid,text,text,text,text\[\]\)'\s*\)/,
    );
    expect(postcheck010).toMatch(
      /p\.oid\s*=\s*to_regprocedure\(/,
    );
    // Must not gate on identity-argument display text (names vary by PG/client).
    expect(postcheck010).not.toMatch(
      /pg_get_function_identity_arguments\s*\(\s*p\.oid\s*\)\s*=\s*'uuid,\s*text,\s*text,\s*text,\s*text\[\]'/,
    );
    expect(postcheck010).not.toContain(
      "= 'uuid, text, text, text, text[]'",
    );
  });

  it("does not edit migration 008 file contents via 010", () => {
    expect(sql008).toContain("from unnest(coalesce(p_total_step_ids");
    expect(sql010).toContain("DO NOT apply until human review");
  });
});

describe("journey progress migration 011 role least privilege", () => {
  const sql008 = readFileSync(migrationPath, "utf8");
  const sql009 = readFileSync(migration009Path, "utf8");
  const sql010 = readFileSync(migration010Path, "utf8");
  const sql011 = readFileSync(migration011Path, "utf8");
  const postcheck011 = readFileSync(postcheck011Path, "utf8");

  it("revokes only DELETE/TRUNCATE/REFERENCES/TRIGGER from authenticated and service_role", () => {
    expect(sql011).toMatch(
      /revoke\s+delete,\s*truncate,\s*references,\s*trigger\s+on\s+table\s+public\.journey_progress\s+from\s+authenticated/i,
    );
    expect(sql011).toMatch(
      /revoke\s+delete,\s*truncate,\s*references,\s*trigger\s+on\s+table\s+public\.journey_progress\s+from\s+service_role/i,
    );
    expect(sql011).not.toMatch(
      /revoke\s+all\s+on\s+table\s+public\.journey_progress\s+from\s+authenticated/i,
    );
    expect(sql011).not.toMatch(
      /revoke\s+all\s+on\s+table\s+public\.journey_progress\s+from\s+service_role/i,
    );
  });

  it("reaffirms SELECT/INSERT/UPDATE without GRANT ALL", () => {
    expect(sql011).toMatch(
      /grant\s+select,\s*insert,\s*update\s+on\s+table\s+public\.journey_progress\s+to\s+authenticated/i,
    );
    expect(sql011).toMatch(
      /grant\s+select,\s*insert,\s*update\s+on\s+table\s+public\.journey_progress\s+to\s+service_role/i,
    );
    expect(sql011).not.toMatch(/grant\s+all\b/i);
    expect(sql011).not.toMatch(
      /grant\s+[^;]*\bdelete\b[^;]*to\s+(?:authenticated|service_role)/i,
    );
  });

  it("does not alter RPC bodies, policies, or schema", () => {
    expect(sql011).not.toMatch(/create\s+or\s+replace\s+function/i);
    expect(sql011).not.toMatch(/create\s+table/i);
    expect(sql011).not.toMatch(/alter\s+table/i);
    expect(sql011).not.toMatch(/create\s+policy/i);
    expect(sql011).not.toMatch(/drop\s+policy/i);
    expect(sql011).not.toMatch(/security\s+definer/i);
    expect(sql011).not.toContain("completed_step_ids");
  });

  it("leaves migrations 008–010 intact (011 is additive only)", () => {
    expect(sql008).toContain("create table public.journey_progress");
    expect(sql008).toMatch(/unnest\([^)]*\)\s+as\s+e\b/i);
    expect(sql009).toContain("anonymous_access_hardening");
    expect(sql009).toMatch(
      /revoke\s+all\s+on\s+table\s+public\.journey_progress\s+from\s+anon/i,
    );
    expect(sql010).toContain("as item(step_id)");
    expect(sql010).toContain("as exp(step_id)");
    expect(sql011).not.toContain("create table public.journey_progress");
    expect(sql011).not.toContain("as item(step_id)");
  });

  it("ships read-only postcheck covering all privilege classes and overall_ok", () => {
    expect(postcheck011).toContain("READ ONLY");
    expect(postcheck011).toContain("Does not mutate data");
    expect(postcheck011).toContain("overall_ok");
    expect(postcheck011).toContain("anon_table_privileges_blocked");
    expect(postcheck011).toContain("authenticated_dml_ok");
    expect(postcheck011).toContain("authenticated_excess_revoked");
    expect(postcheck011).toContain("service_role_dml_ok");
    expect(postcheck011).toContain("service_role_excess_revoked");
    expect(postcheck011).toContain("rpc_execute_granted");
    expect(postcheck011).toContain("anon_rpc_execute_blocked");
    expect(postcheck011).toContain("public_rpc_execute_absent");
    expect(postcheck011).toContain("rls_enabled");
    expect(postcheck011).toContain("ownership_policies_intact");
    expect(postcheck011).toContain("no_delete_policy");
    expect(postcheck011).toContain("complete_function_exists");
    expect(postcheck011).toContain("complete_security_invoker");
    for (const priv of [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
      "REFERENCES",
      "TRIGGER",
    ]) {
      expect(postcheck011).toContain(priv);
    }
    expect(postcheck011).toMatch(
      /and\s+authenticated_excess_revoked[\s\S]*and\s+service_role_excess_revoked[\s\S]*as\s+overall_ok/,
    );
    expect(postcheck011).not.toMatch(
      /has_(?:table|function)_privilege\(\s*'PUBLIC'/i,
    );
    expect(postcheck011).toContain("a.grantee = 0");
  });
});

describe("journey progress API error contract after grant hardening", () => {
  it("maps JourneyProgressError to stable client codes (not generic 500)", () => {
    const persist = new JourneyProgressError(
      'permission denied for table journey_progress',
      "persist_failed",
    );
    const client = toClientError(persist);
    expect(client.status).toBe(503);
    expect(client.code).toBe("persist_failed");
    expect(client.message).toMatch(/salvar o progresso/i);
    expect(client.message).not.toMatch(/Algo deu errado/i);

    const invalid = new JourneyProgressError("bad", "invalid_input");
    expect(toClientError(invalid)).toMatchObject({
      status: 400,
      code: "invalid_input",
    });
  });

  it("repository uses service_role admin client and never DELETE", () => {
    const repoSrc = readFileSync(
      join(root, "src", "lib", "journeys", "progress", "repository.ts"),
      "utf8",
    );
    expect(repoSrc).toContain("createAdminClient");
    expect(repoSrc).toContain("complete_journey_progress_step");
    expect(repoSrc).toContain("unwrapRpcRow");
    expect(repoSrc).toContain("journey_progress_rpc_failed");
    expect(repoSrc).not.toMatch(/\.delete\(/);
    expect(repoSrc).not.toMatch(/from\([\"']journey_progress[\"']\)[\s\S]*\.insert/);
  });

  it("complete client surfaces persist_failed message from API body", () => {
    expect(
      mapJourneyCompleteError({
        status: 503,
        code: "persist_failed",
        message: "Não foi possível salvar o progresso. Tente de novo.",
      }),
    ).toMatch(/salvar o progresso/i);
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
