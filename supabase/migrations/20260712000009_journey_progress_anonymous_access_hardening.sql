-- =============================================================================
-- 20260712000009_journey_progress_anonymous_access_hardening.sql
-- Close anonymous grant surface on journey_progress + related RPCs.
-- DO NOT apply until human review + backup + postcheck plan
--   (see docs/READING_JOURNEYS_PERSISTENCE.md, docs/DATABASE.md).
-- Does not alter schema, RPC bodies, SECURITY mode, entitlements, or MIG 004/008.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table privileges
-- Remote gap: anon held explicit SELECT/INSERT/UPDATE/DELETE/(REFERENCES/TRIGGER/
-- TRUNCATE). Effective row access was still blocked by RLS + ownership predicates,
-- but the anonymous surface depended solely on RLS.
--
-- Code proof (src/lib/journeys/progress/repository.ts, src/lib/admin/users.ts):
--   - Reads: direct SELECT via service_role admin client only
--   - start / completeStep / reset: RPCs via service_role only
--   - No direct INSERT/UPDATE from app code
--   - No DELETE usage (reset clears via UPDATE inside RPC)
-- authenticated keeps SELECT/INSERT/UPDATE so SECURITY INVOKER RPCs + own-row
-- policies remain usable for JWT callers; no DELETE.
-- -----------------------------------------------------------------------------

revoke all on table public.journey_progress from anon;
revoke all on table public.journey_progress from public;

grant select, insert, update on table public.journey_progress to authenticated;
grant select, insert, update on table public.journey_progress to service_role;

-- -----------------------------------------------------------------------------
-- RPC EXECUTE — exact signatures from MIG 008; keep SECURITY INVOKER bodies.
-- -----------------------------------------------------------------------------

revoke all on function public.start_journey_progress(uuid, text, text) from public;
revoke all on function public.start_journey_progress(uuid, text, text) from anon;
revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from public;
revoke all on function public.complete_journey_progress_step(uuid, text, text, text, text[]) from anon;
revoke all on function public.reset_journey_progress(uuid, text) from public;
revoke all on function public.reset_journey_progress(uuid, text) from anon;

grant execute on function public.start_journey_progress(uuid, text, text) to authenticated;
grant execute on function public.start_journey_progress(uuid, text, text) to service_role;

grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.complete_journey_progress_step(uuid, text, text, text, text[]) to service_role;

grant execute on function public.reset_journey_progress(uuid, text) to authenticated;
grant execute on function public.reset_journey_progress(uuid, text) to service_role;
