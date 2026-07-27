-- =============================================================================
-- 20260712000010_journey_progress_complete_rpc_unnest_fix.sql
-- Repair complete_journey_progress_step: PG 42883 (undefined_function) from
-- unnest table-aliases used as scalars (trim(record) / record = text).
-- DO NOT apply until human review + postcheck (see docs/READING_JOURNEYS_PERSISTENCE.md).
-- Does not alter table schema, RLS policies, or other RPCs.
-- =============================================================================

-- Cause (production log): op=completeStep code=42883 (undefined_function).
-- MIG 008 used unnest table aliases without column lists, then applied
-- scalar functions/operators to those aliases (record-typed in expression
-- position). Repair uses explicit column aliases: item(step_id), exp(step_id).
-- start_journey_progress does not use unnest and is unaffected.

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
  expected text[];
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if caller is not null and caller is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  slug := trim(p_journey_slug);
  step := trim(p_step_id);
  if slug is null or char_length(slug) = 0 then
    raise exception 'journey_slug required';
  end if;
  if step is null or char_length(step) = 0 then
    raise exception 'step_id required';
  end if;

  expected := coalesce(
    (
      select array_agg(distinct trim(item.step_id))
      from unnest(coalesce(p_total_step_ids, '{}'::text[])) as item(step_id)
      where char_length(trim(item.step_id)) > 0
    ),
    '{}'::text[]
  );

  -- Ensure row exists without wiping progress
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
    nullif(trim(coalesce(p_next_step_id, '')), ''),
    timezone('utc', now())
  )
  on conflict (user_id, journey_slug) do nothing;

  -- One locked UPDATE merges ids + completion (row lock serializes concurrent writers)
  update public.journey_progress
  set
    completed_step_ids = (
      select coalesce(array_agg(distinct item.step_id order by item.step_id), '{}'::text[])
      from unnest(completed_step_ids || array[step]::text[]) as item(step_id)
      where char_length(item.step_id) > 0
    ),
    current_step_id = case
      when cardinality(expected) > 0
        and (
          select coalesce(bool_and(exp.step_id = any (
            (
              select coalesce(array_agg(distinct item.step_id order by item.step_id), '{}'::text[])
              from unnest(completed_step_ids || array[step]::text[]) as item(step_id)
              where char_length(item.step_id) > 0
            )
          )), false)
          from unnest(expected) as exp(step_id)
        )
      then null
      else coalesce(
        nullif(trim(coalesce(p_next_step_id, '')), ''),
        current_step_id
      )
    end,
    completed_at = case
      when cardinality(expected) > 0
        and (
          select coalesce(bool_and(exp.step_id = any (
            (
              select coalesce(array_agg(distinct item.step_id order by item.step_id), '{}'::text[])
              from unnest(completed_step_ids || array[step]::text[]) as item(step_id)
              where char_length(item.step_id) > 0
            )
          )), false)
          from unnest(expected) as exp(step_id)
        )
      then coalesce(completed_at, timezone('utc', now()))
      else completed_at
    end
  where user_id = p_user_id
    and journey_slug = slug
  returning * into result;

  return result;
end;
$$;

comment on function public.complete_journey_progress_step(uuid, text, text, text, text[]) is
  'Atomically append a completed step id; set completed_at when every expected id is present. MIG 010: unnest column aliases fix PG 42883.';

-- Reaffirm grant surface from MIG 009 (no anon/PUBLIC EXECUTE; authenticated + service_role).
revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from public;
revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from anon;

grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to service_role;

-- Table surface unchanged from 009 — reaffirm only (no schema change).
revoke all on table public.journey_progress from anon;
revoke all on table public.journey_progress from public;
grant select, insert, update on table public.journey_progress to authenticated;
grant select, insert, update on table public.journey_progress to service_role;
