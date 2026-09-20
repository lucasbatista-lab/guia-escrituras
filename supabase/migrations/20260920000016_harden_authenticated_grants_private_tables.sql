-- Migration 016: harden authenticated grants for private product tables (014/015).
--
-- Context:
-- Tables created in 014/015 may inherit excess default privileges for role
-- `authenticated` (e.g. TRUNCATE, TRIGGER, REFERENCES) beyond the DML grants
-- intended by those migrations. Production was corrected manually to least
-- privilege; this migration records the same contract for new environments
-- and future rebuilds. Do NOT re-apply against production if already hardened.
--
-- This migration:
-- - REVOKE ALL PRIVILEGES from authenticated on the listed tables
-- - GRANT only the least-privilege DML needed by the app
--
-- This migration does NOT:
-- - alter schema / columns / indexes / constraints / data
-- - alter RLS or policies
-- - alter service_role / anon / public grants
-- - alter RPCs
-- - touch public.journey_progress

-- public.user_daily_interactions → SELECT, INSERT, UPDATE
revoke all privileges on table public.user_daily_interactions from authenticated;
grant select, insert, update on table public.user_daily_interactions to authenticated;

-- public.product_events → SELECT, INSERT
revoke all privileges on table public.product_events from authenticated;
grant select, insert on table public.product_events to authenticated;

-- public.user_prayers → SELECT, INSERT, UPDATE, DELETE
revoke all privileges on table public.user_prayers from authenticated;
grant select, insert, update, delete on table public.user_prayers to authenticated;

-- public.user_saved_items → SELECT, INSERT, UPDATE, DELETE
revoke all privileges on table public.user_saved_items from authenticated;
grant select, insert, update, delete on table public.user_saved_items to authenticated;

-- public.user_private_entries → SELECT, INSERT, UPDATE, DELETE
revoke all privileges on table public.user_private_entries from authenticated;
grant select, insert, update, delete on table public.user_private_entries to authenticated;
