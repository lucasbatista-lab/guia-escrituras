-- =============================================================================
-- READ ONLY structural postcheck for MIG 012 — complete RPC runtime fix
-- Run after applying 20260712000012_*.sql. Does not mutate data.
-- NOT sufficient proof alone — also run the transactional runtime smoke:
--   20260712000012_journey_progress_complete_rpc_runtime_smoke.sql
-- Expect overall_ok = true.
-- =============================================================================

with fn as (
  select
    p.oid,
    p.prosecdef as is_security_definer,
    coalesce(p.proconfig, '{}'::text[]) as proconfig,
    pg_get_functiondef(p.oid) as def
  from pg_proc p
  where p.oid = to_regprocedure(
    'public.complete_journey_progress_step(uuid,text,text,text,text[])'
  )
),
checks as (
  select
    (select count(*) = 1 from fn) as function_exists_exact_signature,
    (select bool_and(not is_security_definer) from fn) as security_invoker,
    (
      select bool_and(
        exists (
          select 1
          from unnest(proconfig) as cfg(val)
          where val = 'search_path=public'
        )
      )
      from fn
    ) as search_path_public,
    (
      select bool_and(
        def ~* '\bexpected\s+text\[\]'
        and def ~* '\bmerged\s+text\[\]'
        and def ~* '\bis_complete\s+boolean'
      )
      from fn
    ) as plpgsql_vars_present,
    (
      select bool_and(
        def ~* 'expected\s*<@\s*merged'
      )
      from fn
    ) as containment_check_present,
    (
      select bool_and(
        def !~* '=\s*any\s*\(\s*\('
        and def !~* 'any\s*\(\s*\(\s*select'
      )
      from fn
    ) as any_subquery_absent,
    (
      select bool_and(
        def !~* 'unnest\([^\)]*\)\s+as\s+e\b'
        and def !~* 'unnest\([^\)]*\)\s+as\s+x\b'
        and def !~* 'trim\(\s*e\s*\)'
        and def !~* 'char_length\(\s*x\s*\)'
        and def !~* 'bool_and\(\s*e\s*='
        and def !~* 'array_agg\(distinct\s+x\b'
      )
      from fn
    ) as bare_record_alias_absent,
    (
      select
        has_function_privilege('authenticated', oid, 'EXECUTE')
        and has_function_privilege('service_role', oid, 'EXECUTE')
        and not has_function_privilege('anon', oid, 'EXECUTE')
      from fn
      limit 1
    ) as rpc_grants_ok,
    (
      select
        not has_table_privilege('anon', 'public.journey_progress', 'SELECT')
        and not has_table_privilege('anon', 'public.journey_progress', 'INSERT')
        and not has_table_privilege('anon', 'public.journey_progress', 'UPDATE')
        and not has_table_privilege('anon', 'public.journey_progress', 'DELETE')
        and has_table_privilege('authenticated', 'public.journey_progress', 'SELECT')
        and has_table_privilege('authenticated', 'public.journey_progress', 'INSERT')
        and has_table_privilege('authenticated', 'public.journey_progress', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.journey_progress', 'DELETE')
        and not has_table_privilege('authenticated', 'public.journey_progress', 'TRUNCATE')
        and not has_table_privilege('authenticated', 'public.journey_progress', 'REFERENCES')
        and not has_table_privilege('authenticated', 'public.journey_progress', 'TRIGGER')
        and has_table_privilege('service_role', 'public.journey_progress', 'SELECT')
        and has_table_privilege('service_role', 'public.journey_progress', 'INSERT')
        and has_table_privilege('service_role', 'public.journey_progress', 'UPDATE')
        and not has_table_privilege('service_role', 'public.journey_progress', 'DELETE')
        and not has_table_privilege('service_role', 'public.journey_progress', 'TRUNCATE')
        and not has_table_privilege('service_role', 'public.journey_progress', 'REFERENCES')
        and not has_table_privilege('service_role', 'public.journey_progress', 'TRIGGER')
    ) as table_grants_ok,
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
    ) as policies_intact,
    (
      select count(*) = 0
      from pg_policies
      where schemaname = 'public'
        and tablename = 'journey_progress'
        and cmd = 'DELETE'
    ) as no_delete_policy
)
select
  function_exists_exact_signature,
  security_invoker,
  search_path_public,
  plpgsql_vars_present,
  containment_check_present,
  any_subquery_absent,
  bare_record_alias_absent,
  rpc_grants_ok,
  table_grants_ok,
  rls_enabled,
  policies_intact,
  no_delete_policy,
  (
    function_exists_exact_signature
    and security_invoker
    and search_path_public
    and plpgsql_vars_present
    and containment_check_present
    and any_subquery_absent
    and bare_record_alias_absent
    and rpc_grants_ok
    and table_grants_ok
    and rls_enabled
    and policies_intact
    and no_delete_policy
  ) as overall_ok
from checks;
