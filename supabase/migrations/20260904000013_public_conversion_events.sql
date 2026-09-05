-- =============================================================================
-- 20260904000013_public_conversion_events.sql
-- Durable first-party funnel events (visits / CTA / signup_started).
-- Trusted backend (service_role) writes only. No public read policies.
-- DO NOT apply until human review + backup (see docs/ACQUISITION_EVENTS.md).
-- =============================================================================

create table public.public_conversion_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  received_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  path text not null,
  viewport_class text not null
    check (viewport_class in ('mobile', 'tablet', 'desktop')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  session_key text not null,
  constraint public_conversion_events_event_id_len
    check (char_length(event_id) >= 8 and char_length(event_id) <= 64),
  constraint public_conversion_events_session_key_len
    check (char_length(session_key) >= 8 and char_length(session_key) <= 64),
  constraint public_conversion_events_path_len
    check (char_length(path) >= 1 and char_length(path) <= 200),
  constraint public_conversion_events_utm_source_len
    check (utm_source is null or char_length(utm_source) <= 120),
  constraint public_conversion_events_utm_medium_len
    check (utm_medium is null or char_length(utm_medium) <= 120),
  constraint public_conversion_events_utm_campaign_len
    check (utm_campaign is null or char_length(utm_campaign) <= 120),
  constraint public_conversion_events_utm_content_len
    check (utm_content is null or char_length(utm_content) <= 120),
  constraint public_conversion_events_event_name_allowed
    check (event_name in (
      'landing_viewed',
      'product_demo_viewed',
      'product_demo_topic_selected',
      'plans_cta_clicked',
      'plan_selected',
      'signup_started',
      'paid_landing_viewed',
      'paid_landing_primary_cta_clicked',
      'paid_landing_demo_clicked',
      'paid_landing_demo_viewed',
      'paid_landing_plans_viewed',
      'paid_landing_plan_selected'
    )),
  constraint public_conversion_events_path_allowed
    check (path in (
      '/',
      '/comece',
      '/comece-v2',
      '/planos',
      '/cadastro',
      '/confira-seu-email',
      '/email-confirmado',
      '/assinar/continuar'
    ))
);

comment on table public.public_conversion_events is
  'First-party funnel beacons. No conversation content, email, tokens, or full URLs. Trusted backend only.';

comment on column public.public_conversion_events.event_id is
  'Client-generated idempotency key; retries must not double-count.';

comment on column public.public_conversion_events.session_key is
  'Opaque tab-session key for unique-visitor aggregates; not an advertising id.';

comment on column public.public_conversion_events.received_at is
  'Server receive time (UTC). Report windows convert to America/Sao_Paulo.';

create unique index public_conversion_events_event_id_uidx
  on public.public_conversion_events (event_id);

create index public_conversion_events_received_at_idx
  on public.public_conversion_events (received_at desc);

create index public_conversion_events_campaign_content_idx
  on public.public_conversion_events (utm_campaign, utm_content, received_at desc);

create index public_conversion_events_event_name_received_idx
  on public.public_conversion_events (event_name, received_at desc);

create index public_conversion_events_session_received_idx
  on public.public_conversion_events (session_key, received_at desc);

alter table public.public_conversion_events enable row level security;

-- No policies: anon/authenticated cannot read or write via PostgREST.
-- service_role bypasses RLS for trusted server inserts and operator reports.

revoke all on table public.public_conversion_events from anon;
revoke all on table public.public_conversion_events from authenticated;
revoke all on table public.public_conversion_events from public;

grant select, insert on table public.public_conversion_events to service_role;
