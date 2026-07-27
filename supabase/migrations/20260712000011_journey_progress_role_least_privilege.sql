-- =============================================================================
-- 20260712000011_journey_progress_role_least_privilege.sql
-- Close least privilege on public.journey_progress for authenticated +
-- service_role: revoke historical excess DELETE/TRUNCATE/REFERENCES/TRIGGER.
-- DO NOT apply until human review + backup + postcheck
--   (see docs/READING_JOURNEYS_PERSISTENCE.md, docs/DATABASE.md).
-- Does not alter schema, RLS, policies, RPC bodies, SECURITY mode, data,
-- entitlements, or MIG 004/008/009/010.
-- =============================================================================

-- Remote diagnosis (post-010): GRANT is additive. MIG 009/010 affirmed
-- SELECT/INSERT/UPDATE but did not remove prior excess privileges.
-- Photograph:
--   anon: none
--   authenticated / service_role: SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
--     REFERENCES, TRIGGER
-- App proof: no client DELETE; reset clears via UPDATE inside RPC;
-- repository uses service_role RPCs + SELECT only.

revoke delete, truncate, references, trigger
  on table public.journey_progress
  from authenticated;

revoke delete, truncate, references, trigger
  on table public.journey_progress
  from service_role;

grant select, insert, update
  on table public.journey_progress
  to authenticated;

grant select, insert, update
  on table public.journey_progress
  to service_role;
