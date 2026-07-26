-- =============================================================================
-- Postcheck CONSOLIDADO (READ ONLY) — journey_progress
-- Preferencial a partir de 2026-07-20 (retorna UMA linha / um result set).
-- Atualizado para MIG 009 (anonymous access hardening): verifica anon e PUBLIC
-- separadamente (has_*_privilege para anon; ACL/catálogo para PUBLIC).
-- O postcheck multi-result set original permanece em:
--   20260712000008_journey_progress_postcheck.sql
--
-- Uso: colar no Supabase SQL Editor (produção). Não modifica dados nem schema.
-- Não depende de usuário autenticado. Não retorna UUIDs nem conteúdo pessoal.
-- Não consulta conteúdo de progresso (sem SELECT em linhas de journey_progress).
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
anon_table_effective as (
  select
    case
      when to_regclass('public.journey_progress') is null then false
      else
        not coalesce(has_table_privilege('anon', 'public.journey_progress', 'select'), false)
        and not coalesce(has_table_privilege('anon', 'public.journey_progress', 'insert'), false)
        and not coalesce(has_table_privilege('anon', 'public.journey_progress', 'update'), false)
        and not coalesce(has_table_privilege('anon', 'public.journey_progress', 'delete'), false)
    end as anon_table_privileges_blocked
),
anon_table_explicit as (
  select
    case
      when to_regclass('public.journey_progress') is null then false
      else not exists (
        select 1
        from information_schema.role_table_grants g
        where g.table_schema = 'public'
          and g.table_name = 'journey_progress'
          and g.grantee = 'anon'
          and g.privilege_type in (
            'SELECT', 'INSERT', 'UPDATE', 'DELETE',
            'TRUNCATE', 'REFERENCES', 'TRIGGER'
          )
      )
    end as anon_table_explicit_grants_absent
),
public_table_acl as (
  select
    case
      when to_regclass('public.journey_progress') is null then false
      else not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(
          coalesce(c.relacl, acldefault('r', c.relowner))
        ) a
        where n.nspname = 'public'
          and c.relname = 'journey_progress'
          and a.grantee = 0 -- PUBLIC
          and a.privilege_type in (
            'SELECT', 'INSERT', 'UPDATE', 'DELETE',
            'TRUNCATE', 'REFERENCES', 'TRIGGER'
          )
      )
    end as public_table_privileges_absent
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
anon_rpc_execute as (
  select
    (
      to_regprocedure('public.start_journey_progress(uuid,text,text)') is null
      or not coalesce(
        has_function_privilege(
          'anon',
          'public.start_journey_progress(uuid,text,text)',
          'execute'
        ),
        false
      )
    )
    and (
      to_regprocedure('public.complete_journey_progress_step(uuid,text,text,text,text[])') is null
      or not coalesce(
        has_function_privilege(
          'anon',
          'public.complete_journey_progress_step(uuid,text,text,text,text[])',
          'execute'
        ),
        false
      )
    )
    and (
      to_regprocedure('public.reset_journey_progress(uuid,text)') is null
      or not coalesce(
        has_function_privilege(
          'anon',
          'public.reset_journey_progress(uuid,text)',
          'execute'
        ),
        false
      )
    ) as anon_rpc_execute_blocked
),
public_rpc_acl as (
  select
    not exists (
      select 1
      from (
        values
          ('public.start_journey_progress(uuid,text,text)'::text),
          ('public.complete_journey_progress_step(uuid,text,text,text,text[])'),
          ('public.reset_journey_progress(uuid,text)')
      ) as sigs(sig)
      cross join lateral (
        select to_regprocedure(sigs.sig) as oid
      ) p
      cross join lateral aclexplode(
        coalesce(
          (select proacl from pg_proc where oid = p.oid),
          acldefault('f', (select proowner from pg_proc where oid = p.oid))
        )
      ) a
      where p.oid is not null
        and a.grantee = 0 -- PUBLIC
        and a.privilege_type = 'EXECUTE'
    ) as public_rpc_execute_absent
),
grant_check as (
  select
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
schema_only_check as (
  -- Catalog-only: do not SELECT progress row payloads (no UUIDs / step ids / timestamps).
  select (to_regclass('public.journey_progress') is not null) as schema_present_without_row_scan
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
  pol.no_delete_policy,
  ate.anon_table_privileges_blocked,
  atx.anon_table_explicit_grants_absent,
  pta.public_table_privileges_absent,
  rpc.rpc_start_exists,
  rpc.rpc_complete_exists,
  rpc.rpc_reset_exists,
  are.anon_rpc_execute_blocked,
  pra.public_rpc_execute_absent,
  g.authenticated_execute_granted,
  g.service_role_execute_granted,
  tr.updated_at_trigger_exists,
  so.schema_present_without_row_scan,
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
    and ate.anon_table_privileges_blocked
    and atx.anon_table_explicit_grants_absent
    and pta.public_table_privileges_absent
    and rpc.rpc_start_exists
    and rpc.rpc_complete_exists
    and rpc.rpc_reset_exists
    and are.anon_rpc_execute_blocked
    and pra.public_rpc_execute_absent
    and g.authenticated_execute_granted
    and g.service_role_execute_granted
    and tr.updated_at_trigger_exists
    and so.schema_present_without_row_scan
  ) as overall_ok
from table_check t
cross join columns_check c
cross join pk_check p
cross join fk_check f
cross join cascade_check casc
cross join rls_check r
cross join policy_check pol
cross join anon_table_effective ate
cross join anon_table_explicit atx
cross join public_table_acl pta
cross join rpc_check rpc
cross join anon_rpc_execute are
cross join public_rpc_acl pra
cross join grant_check g
cross join trigger_check tr
cross join schema_only_check so;
