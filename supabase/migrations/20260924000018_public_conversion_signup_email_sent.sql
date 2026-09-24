-- =============================================================================
-- 20260924000018_public_conversion_signup_email_sent.sql
-- Additive: extend public_conversion_events event_name allowlist with
-- signup_email_sent (Supabase accepted signup + confirmation email stage).
-- Does NOT recreate table. Does NOT touch unrelated schema.
-- Safe to apply on production that already has migration 013.
-- =============================================================================

alter table public.public_conversion_events
  drop constraint if exists public_conversion_events_event_name_allowed;

alter table public.public_conversion_events
  add constraint public_conversion_events_event_name_allowed
  check (event_name in (
    'landing_viewed',
    'product_demo_viewed',
    'product_demo_topic_selected',
    'plans_cta_clicked',
    'plan_selected',
    'signup_started',
    'signup_email_sent',
    'paid_landing_viewed',
    'paid_landing_primary_cta_clicked',
    'paid_landing_demo_clicked',
    'paid_landing_demo_viewed',
    'paid_landing_plans_viewed',
    'paid_landing_plan_selected'
  ));

comment on constraint public_conversion_events_event_name_allowed
  on public.public_conversion_events is
  'Allowlist includes signup_email_sent (018) between signup_started and free_account_created.';
