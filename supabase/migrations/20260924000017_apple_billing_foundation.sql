-- =============================================================================
-- 20260924000017_apple_billing_foundation.sql
-- Additive Apple IAP persistence + provider event idempotency.
-- Stripe tables untouched. Safe with old code (new tables unused until deploy).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- apple_subscriptions — companion model (not stuffed into Stripe columns)
-- Ownership: (environment, original_transaction_id) → at most one user_id
-- -----------------------------------------------------------------------------
create table public.apple_subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- Null until a verified claim binds the Apple lineage to an Amém user.
  user_id uuid references public.profiles (id) on delete cascade,
  environment text not null
    check (environment in ('sandbox', 'production')),
  original_transaction_id text not null,
  product_id text not null,
  plan_key text not null references public.plans (key),
  -- Normalized access status used by EffectiveAccess mapping.
  -- grants: active | grace
  -- denies: expired | revoked | billing_retry
  access_status text not null
    check (access_status in (
      'active',
      'grace',
      'expired',
      'revoked',
      'billing_retry'
    )),
  -- Opaque Apple raw status/subtype for ops (not client authority).
  apple_status text,
  expires_at timestamptz,
  grace_period_expires_at timestamptz,
  auto_renew_enabled boolean,
  -- Monotonic guard against out-of-order App Store notifications.
  last_signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint apple_subscriptions_env_original_uidx
    unique (environment, original_transaction_id)
);

create trigger apple_subscriptions_set_updated_at
before update on public.apple_subscriptions
for each row execute function public.set_updated_at();

create index apple_subscriptions_user_id_idx
  on public.apple_subscriptions (user_id)
  where user_id is not null;

create index apple_subscriptions_access_status_idx
  on public.apple_subscriptions (access_status);

create index apple_subscriptions_user_access_idx
  on public.apple_subscriptions (user_id, access_status)
  where user_id is not null;

alter table public.apple_subscriptions enable row level security;

-- Authenticated may read own bound rows; never mutate from the browser.
create policy "apple_subscriptions_select_own"
  on public.apple_subscriptions for select
  using (auth.uid() = user_id);

revoke all on table public.apple_subscriptions from anon;
revoke all on table public.apple_subscriptions from authenticated;
grant select on table public.apple_subscriptions to authenticated;

comment on table public.apple_subscriptions is
  'Apple auto-renewable subscriptions. Server-owned writes. Ownership unique per environment+originalTransactionId.';

-- -----------------------------------------------------------------------------
-- billing_provider_events — idempotent external provider notifications
-- Distinct from payment_events (Stripe-shaped). Environment-scoped uniqueness.
-- -----------------------------------------------------------------------------
create table public.billing_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('apple', 'stripe')),
  environment text not null
    check (environment in ('sandbox', 'production', 'unknown')),
  external_event_id text not null,
  event_type text not null,
  event_signed_at timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'failed', 'ignored', 'unmatched')),
  payload_sha256 text,
  related_user_id uuid references public.profiles (id) on delete set null,
  related_original_transaction_id text,
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_provider_events_provider_env_external_uidx
    unique (provider, environment, external_event_id)
);

create trigger billing_provider_events_set_updated_at
before update on public.billing_provider_events
for each row execute function public.set_updated_at();

create index billing_provider_events_processing_status_idx
  on public.billing_provider_events (processing_status);

create index billing_provider_events_related_user_id_idx
  on public.billing_provider_events (related_user_id)
  where related_user_id is not null;

alter table public.billing_provider_events enable row level security;

-- No client policies — trusted backend only.
revoke all on table public.billing_provider_events from anon;
revoke all on table public.billing_provider_events from authenticated;

comment on table public.billing_provider_events is
  'Idempotent billing provider event log (Apple ASSN V2, etc.). Minimal metadata; no raw JWS payloads.';
