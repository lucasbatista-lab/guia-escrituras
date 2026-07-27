-- =============================================================================
-- READ ONLY postcheck for MIG 011 — journey_progress role least privilege
-- Run manually after applying 20260712000011_*.sql
-- Does not mutate data. Expect overall_ok = true.
-- PUBLIC checked via ACL/catalog only (never has_*_privilege('PUBLIC', ...)).
-- =============================================================================

with fn as (
  select
    p.oid,
    p.prosecdef as is_security_definer
  from pg_proc p
  where p.oid = to_regprocedure(
    'public.complete_journey_progress_step(uuid,text,text,text,text[])'
  )
),
checks as (
  select
    (
      not has_table_privilege('anon', 'public.journey_progress', 'SELECT')
      and not has_table_privilege('anon', 'public.journey_progress', 'INSERT')
      and not has_table_privilege('anon', 'public.journey_progress', 'UPDATE')
      and not has_table_privilege('anon', 'public.journey_progress', 'DELETE')
      and not has_table_privilege('anon', 'public.journey_progress', 'TRUNCATE')
      and not has_table_privilege('anon', 'public.journey_progress', 'REFERENCES')
      and not has_table_privilege('anon', 'public.journey_progress', 'TRIGGER')
    ) as anon_table_privileges_blocked,
    (
      has_table_privilege('authenticated', 'public.journey_progress', 'SELECT')
      and has_table_privilege('authenticated', 'public.journey_progress', 'INSERT')
      and has_table_privilege('authenticated', 'public.journey_progress', 'UPDATE')
    ) as authenticated_dml_ok,
    (
      not has_table_privilege('authenticated', 'public.journey_progress', 'DELETE')
      and not has_table_privilege('authenticated', 'public.journey_progress', 'TRUNCATE')
      and not has_table_privilege('authenticated', 'public.journey_progress', 'REFERENCES')
      and not has_table_privilege('authenticated', 'public.journey_progress', 'TRIGGER')
    ) as authenticated_excess_revoked,
    (
      has_table_privilege('service_role', 'public.journey_progress', 'SELECT')
      and has_table_privilege('service_role', 'public.journey_progress', 'INSERT')
      and has_table_privilege('service_role', 'public.journey_progress', 'UPDATE')
    ) as service_role_dml_ok,
    (
      not has_table_privilege('service_role', 'public.journey_progress', 'DELETE')
      and not has_table_privilege('service_role', 'public.journey_progress', 'TRUNCATE')
      and not has_table_privilege('service_role', 'public.journey_progress', 'REFERENCES')
      and not has_table_privilege('service_role', 'public.journey_progress', 'TRIGGER')
    ) as service_role_excess_revoked,
    (
      has_function_privilege(
        'authenticated',
        'public.start_journey_progress(uuid,text,text)',
        'EXECUTE'
      )
      and has_function_privilege(
        'authenticated',
        'public.complete_journey_progress_step(uuid,text,text,text,text[])',
        'EXECUTE'
      )
      and has_function_privilege(
        'authenticated',
        'public.reset_journey_progress(uuid,text)',
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        'public.start_journey_progress(uuid,text,text)',
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        'public.complete_journey_progress_step(uuid,text,text,text,text[])',
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        'public.reset_journey_progress(uuid,text)',
        'EXECUTE'
      )
    ) as rpc_execute_granted,
    (
      not has_function_privilege(
        'anon',
        'public.start_journey_progress(uuid,text,text)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.complete_journey_progress_step(uuid,text,text,text,text[])',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.reset_journey_progress(uuid,text)',
        'EXECUTE'
      )
    ) as anon_rpc_execute_blocked,
    (
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
      )
    ) as public_rpc_execute_absent,
    (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'journey_progress'
    ) as rls_enabled,
    (
      select count(*) = 3
      from pg_policies
      where schemaname = 'public'
        and tablename = 'journey_progress'
        and policyname in (
          'journey_progress_select_own',
          'journey_progress_insert_own',
          'journey_progress_update_own'
        )
    ) as ownership_policies_intact,
    (
      select count(*) = 0
      from pg_policies
      where schemaname = 'public'
        and tablename = 'journey_progress'
        and cmd = 'DELETE'
    ) as no_delete_policy,
    (
      select count(*) = 1 from fn
    ) as complete_function_exists,
    (
      select bool_and(not is_security_definer) from fn
    ) as complete_security_invoker
)
select
  anon_table_privileges_blocked,
  authenticated_dml_ok,
  authenticated_excess_revoked,
  service_role_dml_ok,
  service_role_excess_revoked,
  rpc_execute_granted,
  anon_rpc_execute_blocked,
  public_rpc_execute_absent,
  rls_enabled,
  ownership_policies_intact,
  no_delete_policy,
  complete_function_exists,
  complete_security_invoker,
  (
    anon_table_privileges_blocked
    and authenticated_dml_ok
    and authenticated_excess_revoked
    and service_role_dml_ok
    and service_role_excess_revoked
    and rpc_execute_granted
    and anon_rpc_execute_blocked
    and public_rpc_execute_absent
    and rls_enabled
    and ownership_policies_intact
    and no_delete_policy
    and complete_function_exists
    and complete_security_invoker
  ) as overall_ok
from checks;
