-- =============================================================================
-- 20260712000008_journey_progress.sql
-- Reading Journeys progress foundation.
-- DO NOT apply until human review + postcheck plan (see docs/READING_JOURNEYS_PERSISTENCE.md).
-- Does not activate reading_journeys entitlement or any product UI.
-- =============================================================================

-- Progress per user + journey slug. Editorial content lives in the app registry (not DB).
create table public.journey_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  journey_slug text not null,
  version integer not null default 1,
  completed_step_ids text[] not null default '{}'::text[],
  current_step_id text null,
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz null,
  primary key (user_id, journey_slug),
  constraint journey_progress_version_positive check (version >= 1),
  constraint journey_progress_slug_nonempty check (char_length(trim(journey_slug)) > 0)
);

comment on table public.journey_progress is
  'Owner journey progress only — step ids, not personal reflections or chat content.';

comment on column public.journey_progress.completed_step_ids is
  'Distinct completed step ids from the app registry; never personal text.';

create trigger journey_progress_set_updated_at
before update on public.journey_progress
for each row execute function public.set_updated_at();

alter table public.journey_progress enable row level security;

-- Authenticated owners may read/write their own rows.
-- No DELETE policy: reset clears fields via RPC/UPDATE (service_role bypasses RLS).
create policy "journey_progress_select_own"
  on public.journey_progress for select
  using (auth.uid() = user_id);

create policy "journey_progress_insert_own"
  on public.journey_progress for insert
  with check (auth.uid() = user_id);

create policy "journey_progress_update_own"
  on public.journey_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Atomic helpers (avoid SELECT → mutate array in Node → UPDATE lost updates).
-- SECURITY INVOKER + fixed search_path. Authenticated callers may only act as auth.uid().
-- service_role (auth.uid() null) may pass a trusted server-resolved p_user_id.
-- -----------------------------------------------------------------------------

create or replace function public.start_journey_progress(
  p_user_id uuid,
  p_journey_slug text,
  p_first_step_id text
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
  first_step text;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if caller is not null and caller is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  slug := trim(p_journey_slug);
  if slug is null or char_length(slug) = 0 then
    raise exception 'journey_slug required';
  end if;

  first_step := nullif(trim(coalesce(p_first_step_id, '')), '');

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
    first_step,
    timezone('utc', now())
  )
  on conflict (user_id, journey_slug) do update
  set
    current_step_id = coalesce(
      public.journey_progress.current_step_id,
      excluded.current_step_id
    )
  returning * into result;

  return result;
end;
$$;

comment on function public.start_journey_progress(uuid, text, text) is
  'Idempotent journey start; does not wipe completed steps.';

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
    (select array_agg(distinct trim(e)) from unnest(coalesce(p_total_step_ids, '{}'::text[])) as e where char_length(trim(e)) > 0),
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
      select coalesce(array_agg(distinct x order by x), '{}'::text[])
      from unnest(completed_step_ids || array[step]::text[]) as x
      where char_length(x) > 0
    ),
    current_step_id = case
      when cardinality(expected) > 0
        and (
          select coalesce(bool_and(e = any (
            (
              select coalesce(array_agg(distinct x order by x), '{}'::text[])
              from unnest(completed_step_ids || array[step]::text[]) as x
              where char_length(x) > 0
            )
          )), false)
          from unnest(expected) as e
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
          select coalesce(bool_and(e = any (
            (
              select coalesce(array_agg(distinct x order by x), '{}'::text[])
              from unnest(completed_step_ids || array[step]::text[]) as x
              where char_length(x) > 0
            )
          )), false)
          from unnest(expected) as e
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
  'Atomically append a completed step id; set completed_at when every expected id is present.';

create or replace function public.reset_journey_progress(
  p_user_id uuid,
  p_journey_slug text
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
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if caller is not null and caller is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  slug := trim(p_journey_slug);
  if slug is null or char_length(slug) = 0 then
    raise exception 'journey_slug required';
  end if;

  update public.journey_progress
  set
    completed_step_ids = '{}'::text[],
    current_step_id = null,
    completed_at = null,
    started_at = timezone('utc', now())
  where user_id = p_user_id
    and journey_slug = slug
  returning * into result;

  if not found then
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
      null,
      timezone('utc', now())
    )
    returning * into result;
  end if;

  return result;
end;
$$;

comment on function public.reset_journey_progress(uuid, text) is
  'Clears step progress for one journey via UPDATE; no DELETE policy for clients.';

revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from public;
revoke all on function public.start_journey_progress(uuid, text, text) from public;
revoke all on function public.reset_journey_progress(uuid, text) from public;

grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to service_role;

grant execute on function public.start_journey_progress(uuid, text, text) to authenticated;
grant execute on function public.start_journey_progress(uuid, text, text) to service_role;

grant execute on function public.reset_journey_progress(uuid, text) to authenticated;
grant execute on function public.reset_journey_progress(uuid, text) to service_role;
