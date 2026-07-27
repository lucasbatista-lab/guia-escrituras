-- =============================================================================
-- 20260712000012_journey_progress_complete_rpc_runtime_fix.sql
-- Rewrite complete_journey_progress_step: remove ANY((SELECT ...)) which
-- compares text to text[] (SQLSTATE 42883). Use PL/pgSQL vars + expected <@ merged.
-- DO NOT apply until human review + structural postcheck + runtime smoke
--   (see docs/READING_JOURNEYS_PERSISTENCE.md).
-- Does not alter table schema, RLS policies, other RPCs, or MIG 004/008–011.
-- =============================================================================

-- Remaining 42883 after MIG 010 (unnest aliases fixed):
--   exp.step_id = any ( (select coalesce(array_agg(...), '{}'::text[]) ...) )
-- PostgreSQL parses ANY(subquery) as per-row comparison against subquery
-- results. The subquery returns one row of type text[], so the operator
-- sought is text = text[] → undefined_function (42883).
-- Fix: compute merged once into a PL/pgSQL variable; complete via
--   cardinality(expected) > 0 and expected <@ merged
-- No nested SELECT inside ANY. No triple array_agg in the UPDATE.

create or replace function public.complete_journey_progress_step(
  p_user_id uuid,
  p_journey_slug text,
  p_step_id text,
  p_next_step_id text,
  p_total_step_ids text[]
)
returns public.journey_progress
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.journey_progress;
  caller uuid := auth.uid();
  slug text;
  step text;
  next_step text;
  expected text[];
  merged text[];
  is_complete boolean;
begin
  -- A. validate user, slug, step
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if caller is not null and caller is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  slug := trim(p_journey_slug);
  step := trim(p_step_id);
  next_step := nullif(trim(coalesce(p_next_step_id, '')), '');
  if slug is null or char_length(slug) = 0 then
    raise exception 'journey_slug required';
  end if;
  if step is null or char_length(step) = 0 then
    raise exception 'step_id required';
  end if;

  -- B. normalize expected once
  expected := coalesce(
    (
      select array_agg(distinct trim(item.step_id))
      from unnest(coalesce(p_total_step_ids, '{}'::text[])) as item(step_id)
      where char_length(trim(item.step_id)) > 0
    ),
    '{}'::text[]
  );

  -- C. ensure row exists without wiping progress
  insert into public.journey_progress (
    user_id,
    journey_slug,
    completed_step_ids,
    current_step_id,
    started_at
  )
  values (
    p_user_id,
    slug,
    '{}'::text[],
    next_step,
    timezone('utc', now())
  )
  on conflict (user_id, journey_slug) do nothing;

  -- D. lock the row for concurrency
  select *
  into result
  from public.journey_progress
  where user_id = p_user_id
    and journey_slug = slug
  for update;

  if not found then
    raise exception 'journey_progress row missing after insert';
  end if;

  -- E. compute merged once (explicit unnest column alias; no ANY(subquery))
  merged := coalesce(
    (
      select array_agg(distinct item.step_id order by item.step_id)
      from unnest(result.completed_step_ids || array[step]::text[]) as item(step_id)
      where char_length(item.step_id) > 0
    ),
    '{}'::text[]
  );

  -- F. completion via unambiguous array containment (not ANY)
  is_complete := cardinality(expected) > 0 and expected <@ merged;

  -- G. single UPDATE
  update public.journey_progress
  set
    completed_step_ids = merged,
    current_step_id = case
      when is_complete then null
      else coalesce(next_step, current_step_id)
    end,
    completed_at = case
      when is_complete then coalesce(completed_at, timezone('utc', now()))
      else completed_at
    end
  where user_id = p_user_id
    and journey_slug = slug
  returning * into result;

  -- H. return row
  return result;
end;
$$;

comment on function public.complete_journey_progress_step(uuid, text, text, text, text[]) is
  'Atomically append a completed step id; set completed_at when every expected id is present. MIG 012: PL/pgSQL merged + expected <@ merged (no ANY(subquery)).';

-- Reaffirm EXECUTE surface (009) — no anon/PUBLIC; authenticated + service_role.
revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from public;
revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from anon;

grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to service_role;

-- Reaffirm table least privilege (011) — SELECT/INSERT/UPDATE only.
revoke all on table public.journey_progress from anon;
revoke all on table public.journey_progress from public;
revoke delete, truncate, references, trigger on table public.journey_progress from authenticated;
revoke delete, truncate, references, trigger on table public.journey_progress from service_role;
grant select, insert, update on table public.journey_progress to authenticated;
grant select, insert, update on table public.journey_progress to service_role;
