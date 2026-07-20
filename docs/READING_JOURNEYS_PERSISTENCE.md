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
- Anonymous: no access
- RPCs: `EXECUTE` to `authenticated` + `service_role`; revoked from `PUBLIC`
- Admin UI must not gain access from frontend role claims alone

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

1. Review `supabase/migrations/20260712000008_journey_progress.sql`
2. Apply in Supabase (SQL Editor paste **or** `pnpm exec supabase db push --linked` after review)
3. Run postcheck (read-only): `supabase/postchecks/20260712000008_journey_progress_postcheck.sql`
4. Confirm postcheck booleans true / empty table (see note below on SQL Editor result sets)
5. Ship Reading Journeys MVP (entitlement + UI + export) — **done on `main`**

**Postcheck note:** the file runs multiple read-only `SELECT`s. Supabase SQL Editor may show only the **last** result set (e.g. `[{"initially_empty": true}]`). Earlier checks still ran; for assertion-style failure use manual review or run statements individually.

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
