-- =============================================================================
-- Postcheck (READ ONLY) — journey_progress foundation
-- Run in Supabase SQL Editor AFTER applying 20260712000008_journey_progress.sql
-- Do not modify data. Expect all assertions to return true / expected counts.
-- =============================================================================

-- Table exists
select to_regclass('public.journey_progress') is not null as table_exists;

-- Columns
select
  count(*) filter (where column_name = 'user_id') = 1
  and count(*) filter (where column_name = 'journey_slug') = 1
  and count(*) filter (where column_name = 'version') = 1
  and count(*) filter (where column_name = 'completed_step_ids') = 1
  and count(*) filter (where column_name = 'current_step_id') = 1
  and count(*) filter (where column_name = 'started_at') = 1
  and count(*) filter (where column_name = 'updated_at') = 1
  and count(*) filter (where column_name = 'completed_at') = 1
    as expected_columns
from information_schema.columns
where table_schema = 'public'
  and table_name = 'journey_progress';

-- Primary key (user_id, journey_slug)
select
  coalesce(
    (
      select string_agg(a.attname, ',' order by a.attname)
      from pg_index i
      join pg_attribute a
        on a.attrelid = i.indrelid
       and a.attnum = any (i.indkey)
      where i.indrelid = 'public.journey_progress'::regclass
        and i.indisprimary
    ),
    ''
  ) = 'journey_slug,user_id' as primary_key_ok;

-- FK to profiles
select exists (
  select 1
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'journey_progress'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id'
    and ccu.table_name = 'profiles'
) as fk_profiles_ok;

-- RLS enabled
select c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'journey_progress';

-- Own-row policies (no DELETE)
select
  count(*) filter (where policyname = 'journey_progress_select_own') = 1
  and count(*) filter (where policyname = 'journey_progress_insert_own') = 1
  and count(*) filter (where policyname = 'journey_progress_update_own') = 1
  and count(*) filter (where policyname = 'journey_progress_delete_own') = 0
    as policies_ok
from pg_policies
where schemaname = 'public'
  and tablename = 'journey_progress';

-- RPCs exist
select
  to_regprocedure('public.start_journey_progress(uuid,text,text)') is not null
  and to_regprocedure('public.complete_journey_progress_step(uuid,text,text,text,text[])') is not null
  and to_regprocedure('public.reset_journey_progress(uuid,text)') is not null
    as rpcs_exist;

-- No accidental rows from apply (expected empty at foundation)
select count(*) = 0 as initially_empty
from public.journey_progress;
