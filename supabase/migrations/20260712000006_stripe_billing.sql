-- =============================================================================
-- 20260712000006_stripe_billing.sql
-- Stripe billing tables and signup_intent checkout fields.
-- DO NOT apply in this iteration.
-- =============================================================================

create table public.billing_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

create index billing_customers_stripe_customer_id_idx
  on public.billing_customers (stripe_customer_id);

alter table public.billing_customers enable row level security;

comment on table public.billing_customers is
  'Stripe customer mapping. No user-facing policies — trusted backend only.';

-- -----------------------------------------------------------------------------

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text unique not null,
  event_type text not null,
  object_id text,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'failed', 'ignored')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger payment_events_set_updated_at
before update on public.payment_events
for each row execute function public.set_updated_at();

create index payment_events_event_type_idx
  on public.payment_events (event_type);

create index payment_events_processing_status_idx
  on public.payment_events (processing_status);

alter table public.payment_events enable row level security;

comment on table public.payment_events is
  'Idempotent webhook event log without PII payloads. Trusted backend only.';

-- -----------------------------------------------------------------------------

alter table public.signup_intents
  add column if not exists stripe_checkout_session_id text unique,
  add column if not exists checkout_created_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists signup_intents_checkout_session_id_idx
  on public.signup_intents (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
