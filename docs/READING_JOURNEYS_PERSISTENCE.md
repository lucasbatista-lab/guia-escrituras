# Reading Journeys — Persistence (V1)

Schema, RLS, atomic RPCs, domain repository/service, export mapper, and **live feature wiring** (routes, entitlement, export).

See also `docs/READING_JOURNEYS.md` for editorial catalog and UX.

## Decision: dedicated table vs `preferences` JSONB

| Option | Pros | Cons |
|--------|------|------|
| **A.** `spiritual_profiles.preferences` JSONB | Single row, no new table | Merge races; overwrite risk with personalization; weak admin queries; couples journeys to profile upserts |
| **B.** `public.journey_progress` (chosen) | Semantic isolation; atomic RPCs; clear export; per-journey reset; independent evolution; own RLS | Requires migration |

**Choice: B.** There is no existing JSON preferences column, and a dedicated table matches user-owned CASCADE + RLS conventions (`profiles` FK).

## Schema

Table: `public.journey_progress`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid PK part | → `profiles(id)` ON DELETE CASCADE |
| `journey_slug` | text PK part | App registry slug; **no** DB enum of journeys |
| `version` | int default 1 | Forward-compatible |
| `completed_step_ids` | text[] not null default `{}` | Distinct step ids only — never personal text |
| `current_step_id` | text null | Optional pointer |
| `started_at` / `updated_at` / `completed_at` | timestamptz | `updated_at` via existing `set_updated_at()` |

## RLS / policies / grants

- RLS enabled
- `select` / `insert` / `update` own (`auth.uid() = user_id`)
- **No DELETE** for clients — reset clears via `reset_journey_progress` UPDATE
- Anonymous: no access (table + RPC) — enforced by grants in MIG `009`, not RLS alone
- RPCs: `EXECUTE` to `authenticated` + `service_role`; revoked from `anon` and `PUBLIC`
- Table: `SELECT`/`INSERT`/`UPDATE` to `authenticated` + `service_role`; **no** `DELETE`/`TRUNCATE`/`REFERENCES`/`TRIGGER` (MIG `011` aplicada)
- Admin UI must not gain access from frontend role claims alone

### Gap remoto (pós-008) — fechado pela 009

Investigação confirmou grants explícitos de `anon` na tabela e EXECUTE nas três RPCs. Não houve evidência de vazamento de linhas (RLS + ownership + `SECURITY INVOKER`), mas a superfície anônima dependia só da RLS. Correção: `20260712000009_journey_progress_anonymous_access_hardening.sql` — **aplicada em produção 2026-07-26**; postcheck consolidado `overall_ok = true`. MIG `004` permanece pendente e independente.

### Bug remoto complete → PG 42883 — aliases (010) + ANY(subquery) (012) — **encerrado**

Produção (pré-012): `POST /api/journeys/progress/complete` → 503 / `journey_progress_rpc_failed` `{ op: completeStep, code: 42883 }`.

**Causa 1 (fechada pela 010, aplicada):** aliases `unnest(...) AS e` / `AS x` usados como escalares → `record` em posição de expressão.

**Causa 2 (fechada pela 012, aplicada 2026-07-27):** após 010, o corpo ainda tinha:

```sql
exp.step_id = any (
  (select coalesce(array_agg(distinct item.step_id ...), '{}'::text[]) ...)
)
```

`ANY (subquery)` compara o lado esquerdo com **cada linha** da subquery. A subquery devolve uma linha `text[]`, logo o operador exigido é `text = text[]` → `undefined_function` (42883).

**Correção versionada (aplicada):** `20260712000012_journey_progress_complete_rpc_runtime_fix.sql` — variáveis `expected` / `merged` / `is_complete`; um `array_agg`; conclusão via `expected <@ merged`.

**Provas pós-apply:**
- Runtime smoke (`…_runtime_smoke.sql`): `overall_ok=true` (start/intermediate/final/reset).
- Smoke humano UI: conclusão e persistência OK.
- Postcheck estrutural (`…_runtime_fix_postcheck.sql`): `overall_ok=false` **somente** por `plpgsql_vars_present=false` — **falso negativo** (em regex PostgreSQL, `\b` é backspace, não word boundary). Runtime + Jornada 7/7 verdes. Correção futura: só no postcheck. **Não** criar migration.

### Grants históricos — MIG 011 (**aplicada**)

`authenticated` / `service_role` tinham DELETE/TRUNCATE/REFERENCES/TRIGGER históricos. MIG `011` — **aplicada**; postcheck `overall_ok = true`. Nenhum vazamento demonstrado.

## Concurrency

Do **not** implement progress as Node `SELECT → mutate array → UPDATE`.

Use RPCs (SECURITY INVOKER, fixed `search_path`):

- `start_journey_progress(p_user_id, p_journey_slug, p_first_step_id)`
- `complete_journey_progress_step(p_user_id, p_journey_slug, p_step_id, p_next_step_id, p_total_step_ids)`
- `reset_journey_progress(p_user_id, p_journey_slug)`

Authenticated callers may only act when `p_user_id = auth.uid()`.
`service_role` (`auth.uid()` null) may pass a server-resolved user id (trusted backend).

`complete_journey_progress_step` merges ids under a single row `UPDATE` (row lock serializes writers) and sets `completed_at` when every expected id is present.

### How to call after migration (future feature block)

```ts
import { createJourneyProgressService } from "@/lib/journeys/progress/service";
import { getJourneyProgressRepository } from "@/lib/journeys/progress/repository";

const service = createJourneyProgressService(getJourneyProgressRepository());
await service.completeStep({
  userId: auth.userId, // session only
  journeySlug,
  stepId,
  nextStepId,
  totalStepIds, // from registry
});
```

## Application code (wired in Reading Journeys MVP V1)

| Module | Role |
|--------|------|
| `src/lib/journeys/progress/types.ts` | Domain types |
| `memory-repository.ts` | Test double with atomic merge semantics |
| `repository.ts` | Supabase + RPC (`server-only`) |
| `service.ts` | Structural validation / orchestration |
| `export-mapper.ts` | Pure mapper for `amem-chat-user-data-v1` |
| `src/lib/journeys/registry.ts` + `journeys/*` | Editorial catalog (3×7 steps) |
| `src/app/api/journeys/progress/*` | Authenticated progress APIs |
| `src/app/(platform)/jornadas/*` | Catalog, journey, step pages |

`GET /api/account/export` includes `journeyProgress` (additive field on `amem-chat-user-data-v1`).

## Portability (live)

`mapJourneyProgressListForExport` produces per journey:

```ts
{
  journeySlug, version, completedStepIds,
  currentStepId, startedAt, updatedAt, completedAt
}
```

Wire into `buildUserDataExport` via `loadJourneyProgressForExport`. Empty list when no rows. No personal reflection text.

## Admin

Without personal content, admin user detail shows:

- journeys started (`started_at`)
- steps completed (`cardinality(completed_step_ids)`)
- journeys completed (`completed_at is not null`)
- last journey activity (`max(updated_at)`)

Implemented in `src/lib/admin/users.ts` + admin user detail page. No admin edit/reset of progress.

## Privacy

Persisted: step ids + timestamps only.
Never: reflections, chat drafts, prompts, clinical notes, payment data, secrets.

## Apply migration (human)

### 008 (já aplicada em produção)

1. Review `supabase/migrations/20260712000008_journey_progress.sql` — **não reaplicar**
2. Reading Journeys MVP (entitlement + UI + export) — **done on `main`**

### 009 anonymous access hardening (**aplicada 2026-07-26**)

1. Backup + review + apply da `009` — **concluídos** (humano). **Não** reaplicar `008` nem `009`.
2. Postcheck consolidado (read-only) — **verde**: `overall_ok = true`
   `supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql`
3. MIG `004` **não** misturar / **não** aplicada.
4. Legacy multi-result: `supabase/postchecks/20260712000008_journey_progress_postcheck.sql` (não cobre o gap `anon` EXECUTE)

### 010 complete RPC unnest fix (**aplicada**)

1. Apply `20260712000010_…` — **concluído**. **Não** reaplicar.
2. Postcheck função estrutural verde — **não** prova execução (42883 residual).

### 011 role least privilege (**aplicada**)

1. Apply `20260712000011_…` — **concluído**. Postcheck `overall_ok = true`. **Não** reaplicar.

### 012 complete RPC runtime fix (**aplicada 2026-07-27**)

1. Apply `20260712000012_…` — **concluído**. **Não** reaplicar 008–012; **não** misturar MIG 004.
2. Runtime smoke (`…_runtime_smoke.sql`): `overall_ok = true`.
3. Smoke autenticado UI: conclusão e persistência OK.
4. Postcheck estrutural (`…_runtime_fix_postcheck.sql`): ainda `overall_ok = false` — reconciliar campo falso (hipótese `table_grants_ok` / regex). **Não** criar migration.

**Postcheck note:** the legacy file runs multiple read-only `SELECT`s; Supabase SQL Editor may show only the **last** result set. Prefer the consolidated postcheck. Runtime app code does **not** depend on either postcheck file.

**Ops note:** causa `text = text[]` / 42883 no complete **encerrada** após 012 + smoke runtime verde. Residual = apenas postcheck estrutural.

## Emergency rollback (do not run unless required)

Documented only — destructive. Prefer forward fix.

```sql
-- EMERGENCY ONLY — drops progress data permanently
begin;
drop function if exists public.complete_journey_progress_step(uuid, text, text, text, text[]);
drop function if exists public.start_journey_progress(uuid, text, text);
drop function if exists public.reset_journey_progress(uuid, text);
drop table if exists public.journey_progress;
commit;
```

## Safe deploy sequence

1. Ship foundation code — migration + RPCs
2. Apply migration + postcheck in Supabase
3. Ship Reading Journeys feature (registry, entitlement, routes, export)
4. Commercial copy reflects active Jornadas on Caminho/Profundo/Particular

## Tests

```bash
pnpm exec vitest run tests/journey-progress-persistence.test.ts
```
