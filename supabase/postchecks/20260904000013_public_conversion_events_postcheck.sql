-- Postcheck (read-only) for 20260904000013_public_conversion_events
-- Expect overall_ok = true after apply.

with checks as (
  select
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'public_conversion_events'
    ) as table_exists,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and indexname = 'public_conversion_events_event_id_uidx'
    ) as event_id_unique,
    (
      select relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'public_conversion_events'
    ) as rls_enabled,
    not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'public_conversion_events'
    ) as no_policies,
    not has_table_privilege('anon', 'public.public_conversion_events', 'SELECT')
      as anon_no_select,
    not has_table_privilege('anon', 'public.public_conversion_events', 'INSERT')
      as anon_no_insert,
    has_table_privilege('service_role', 'public.public_conversion_events', 'INSERT')
      as service_can_insert,
    has_table_privilege('service_role', 'public.public_conversion_events', 'SELECT')
      as service_can_select
)
select
  *,
  (
    table_exists
    and event_id_unique
    and rls_enabled
    and no_policies
    and anon_no_select
    and anon_no_insert
    and service_can_insert
    and service_can_select
  ) as overall_ok
from checks;
