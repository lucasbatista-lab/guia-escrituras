-- =============================================================================
-- Postcheck CONSOLIDADO (READ ONLY) — journey_progress
-- Preferencial a partir de 2026-07-20 (retorna UMA linha / um result set).
-- O postcheck multi-result set original permanece em:
--   20260712000008_journey_progress_postcheck.sql
--
-- Uso: colar no Supabase SQL Editor (produção). Não modifica dados nem schema.
-- Não depende de usuário autenticado. Não retorna UUIDs nem conteúdo pessoal.
-- Preferir este arquivo amanhã antes/depois do smoke autenticado.
-- =============================================================================

with
table_check as (
  select to_regclass('public.journey_progress') is not null as table_exists
),
columns_check as (
  select
    case
      when to_regclass('public.journey_progress') is null then false
      else (
        select
          count(*) filter (where column_name = 'user_id') = 1
          and count(*) filter (where column_name = 'journey_slug') = 1
          and count(*) filter (where column_name = 'version') = 1
          and count(*) filter (where column_name = 'completed_step_ids') = 1
          and count(*) filter (where column_name = 'current_step_id') = 1
          and count(*) filter (where column_name = 'started_at') = 1
          and count(*) filter (where column_name = 'updated_at') = 1
          and count(*) filter (where column_name = 'completed_at') = 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'journey_progress'
      )
    end as expected_columns_exist
),
pk_check as (
  select
    case
      when to_regclass('public.journey_progress') is null then false
      else coalesce(
        (
          select string_agg(a.attname, ',' order by a.attname)
          from pg_index i
          join pg_attribute a
            on a.attrelid = i.indrelid
           and a.attnum = any (i.indkey)
          where i.indrelid = to_regclass('public.journey_progress')
            and i.indisprimary
        ),
        ''
      ) = 'journey_slug,user_id'
    end as primary_key_valid
),
fk_check as (
  select
    exists (
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
    ) as foreign_key_valid
),
cascade_check as (
  select
    exists (
      select 1
      from information_schema.referential_constraints rc
      join information_schema.table_constraints tc
        on tc.constraint_name = rc.constraint_name
       and tc.constraint_schema = rc.constraint_schema
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.constraint_schema = tc.constraint_schema
      where tc.table_schema = 'public'
        and tc.table_name = 'journey_progress'
        and tc.constraint_type = 'FOREIGN KEY'
        and kcu.column_name = 'user_id'
        and rc.delete_rule = 'CASCADE'
    ) as cascade_delete_valid
),
rls_check as (
  select coalesce(
    (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'journey_progress'
    ),
    false
  ) as rls_enabled
),
policy_check as (
  select
    count(*) filter (where policyname = 'journey_progress_select_own') = 1
      as select_policy_exists,
    count(*) filter (where policyname = 'journey_progress_insert_own') = 1
      as insert_policy_exists,
    count(*) filter (where policyname = 'journey_progress_update_own') = 1
      as update_policy_exists,
    count(*) filter (where policyname = 'journey_progress_delete_own') = 0
      as no_delete_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'journey_progress'
),
anon_check as (
  select
    case
      when to_regclass('public.journey_progress') is null then false
      else
        not coalesce(has_table_privilege('anon', 'public.journey_progress', 'select'), false)
        and not coalesce(has_table_privilege('anon', 'public.journey_progress', 'insert'), false)
        and not coalesce(has_table_privilege('anon', 'public.journey_progress', 'update'), false)
        and not coalesce(has_table_privilege('anon', 'public.journey_progress', 'delete'), false)
    end as anonymous_access_blocked
),
rpc_check as (
  select
    to_regprocedure('public.start_journey_progress(uuid,text,text)') is not null
      as rpc_start_exists,
    to_regprocedure('public.complete_journey_progress_step(uuid,text,text,text,text[])') is not null
      as rpc_complete_exists,
    to_regprocedure('public.reset_journey_progress(uuid,text)') is not null
      as rpc_reset_exists
),
grant_check as (
  select
    (
      to_regprocedure('public.start_journey_progress(uuid,text,text)') is null
      or not has_function_privilege(
        'public',
        'public.start_journey_progress(uuid,text,text)',
        'execute'
      )
    )
    and (
      to_regprocedure('public.complete_journey_progress_step(uuid,text,text,text,text[])') is null
      or not has_function_privilege(
        'public',
        'public.complete_journey_progress_step(uuid,text,text,text,text[])',
        'execute'
      )
    )
    and (
      to_regprocedure('public.reset_journey_progress(uuid,text)') is null
      or not has_function_privilege(
        'public',
        'public.reset_journey_progress(uuid,text)',
        'execute'
      )
    ) as public_execute_revoked,
    to_regprocedure('public.start_journey_progress(uuid,text,text)') is not null
    and has_function_privilege(
      'authenticated',
      'public.start_journey_progress(uuid,text,text)',
      'execute'
    )
    and to_regprocedure('public.complete_journey_progress_step(uuid,text,text,text,text[])') is not null
    and has_function_privilege(
      'authenticated',
      'public.complete_journey_progress_step(uuid,text,text,text,text[])',
      'execute'
    )
    and to_regprocedure('public.reset_journey_progress(uuid,text)') is not null
    and has_function_privilege(
      'authenticated',
      'public.reset_journey_progress(uuid,text)',
      'execute'
    ) as authenticated_execute_granted,
    to_regprocedure('public.start_journey_progress(uuid,text,text)') is not null
    and has_function_privilege(
      'service_role',
      'public.start_journey_progress(uuid,text,text)',
      'execute'
    )
    and to_regprocedure('public.complete_journey_progress_step(uuid,text,text,text,text[])') is not null
    and has_function_privilege(
      'service_role',
      'public.complete_journey_progress_step(uuid,text,text,text,text[])',
      'execute'
    )
    and to_regprocedure('public.reset_journey_progress(uuid,text)') is not null
    and has_function_privilege(
      'service_role',
      'public.reset_journey_progress(uuid,text)',
      'execute'
    ) as service_role_execute_granted
),
trigger_check as (
  select exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'journey_progress'
      and not t.tgisinternal
      and t.tgname = 'journey_progress_set_updated_at'
  ) as updated_at_trigger_exists
),
rows_check as (
  -- Empty is OK after apply. After future smoke, rows must obey structural invariants.
  -- Never returns UUIDs or personal content.
  select
    case
      when to_regclass('public.journey_progress') is null then false
      when (select count(*) from public.journey_progress) = 0 then true
      else not exists (
        select 1
        from public.journey_progress jp
        where jp.version < 1
           or char_length(trim(jp.journey_slug)) = 0
           or jp.completed_step_ids is null
           or jp.started_at is null
           or jp.updated_at is null
           or (
             jp.completed_at is not null
             and cardinality(jp.completed_step_ids) = 0
           )
      )
    end as initially_empty_or_has_valid_rows
)
select
  t.table_exists,
  c.expected_columns_exist,
  p.primary_key_valid,
  f.foreign_key_valid,
  casc.cascade_delete_valid,
  r.rls_enabled,
  pol.select_policy_exists,
  pol.insert_policy_exists,
  pol.update_policy_exists,
  a.anonymous_access_blocked,
  rpc.rpc_start_exists,
  rpc.rpc_complete_exists,
  rpc.rpc_reset_exists,
  g.public_execute_revoked,
  g.authenticated_execute_granted,
  g.service_role_execute_granted,
  tr.updated_at_trigger_exists,
  rows.initially_empty_or_has_valid_rows,
  (
    t.table_exists
    and c.expected_columns_exist
    and p.primary_key_valid
    and f.foreign_key_valid
    and casc.cascade_delete_valid
    and r.rls_enabled
    and pol.select_policy_exists
    and pol.insert_policy_exists
    and pol.update_policy_exists
    and pol.no_delete_policy
    and a.anonymous_access_blocked
    and rpc.rpc_start_exists
    and rpc.rpc_complete_exists
    and rpc.rpc_reset_exists
    and g.public_execute_revoked
    and g.authenticated_execute_granted
    and g.service_role_execute_granted
    and tr.updated_at_trigger_exists
    and rows.initially_empty_or_has_valid_rows
  ) as overall_ok
from table_check t
cross join columns_check c
cross join pk_check p
cross join fk_check f
cross join cascade_check casc
cross join rls_check r
cross join policy_check pol
cross join anon_check a
cross join rpc_check rpc
cross join grant_check g
cross join trigger_check tr
cross join rows_check rows;
