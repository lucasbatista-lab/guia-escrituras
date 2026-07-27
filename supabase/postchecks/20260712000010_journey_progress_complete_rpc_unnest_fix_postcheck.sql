-- =============================================================================
-- READ ONLY postcheck for MIG 010 — journey complete RPC unnest fix
-- Run manually after applying 20260712000010_*.sql
-- Does not mutate data. Expect overall_ok = true.
-- =============================================================================

with fn as (
  select
    p.oid,
    p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_args,
    p.prosecdef as is_security_definer,
    coalesce(p.proconfig, '{}'::text[]) as proconfig,
    pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'complete_journey_progress_step'
    and pg_get_function_identity_arguments(p.oid)
      = 'uuid, text, text, text, text[]'
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
        def ~* 'as item\(step_id\)'
        and def ~* 'as exp\(step_id\)'
        and def ~* 'item\.step_id'
        and def ~* 'exp\.step_id'
      )
      from fn
    ) as fixed_unnest_aliases_present,
    (
      select bool_and(
        -- Bare table-alias scalar misuse from MIG 008 must be gone.
        def !~* 'unnest\([^\)]*\)\s+as\s+e\b'
        and def !~* 'unnest\([^\)]*\)\s+as\s+x\b'
        and def !~* 'trim\(\s*e\s*\)'
        and def !~* 'char_length\(\s*x\s*\)'
        and def !~* 'bool_and\(\s*e\s*='
        and def !~* 'array_agg\(distinct\s+x\b'
      )
      from fn
    ) as invalid_bare_unnest_alias_absent,
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
        and has_table_privilege('service_role', 'public.journey_progress', 'SELECT')
        and has_table_privilege('service_role', 'public.journey_progress', 'INSERT')
        and has_table_privilege('service_role', 'public.journey_progress', 'UPDATE')
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
    ) as policies_intact
)
select
  function_exists_exact_signature,
  security_invoker,
  search_path_public,
  fixed_unnest_aliases_present,
  invalid_bare_unnest_alias_absent,
  rpc_grants_ok,
  table_grants_ok,
  rls_enabled,
  policies_intact,
  (
    function_exists_exact_signature
    and security_invoker
    and search_path_public
    and fixed_unnest_aliases_present
    and invalid_bare_unnest_alias_absent
    and rpc_grants_ok
    and table_grants_ok
    and rls_enabled
    and policies_intact
  ) as overall_ok
from checks;
