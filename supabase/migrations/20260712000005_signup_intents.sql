-- =============================================================================
-- 20260712000005_signup_intents.sql
-- Signup intent funnel: plan → cadastro → confirmação → checkout continuation.
-- DO NOT apply in this iteration.
-- =============================================================================

create table public.signup_intents (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  user_id uuid references public.profiles (id) on delete set null,
  selected_plan_key text not null references public.plans (key),
  referral_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  status text not null default 'pending_signup'
    check (status in (
      'pending_signup',
      'awaiting_confirmation',
      'ready_for_checkout',
      'checkout_created',
      'completed',
      'canceled',
      'expired'
    )),
  terms_version text,
  privacy_version text,
  terms_accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger signup_intents_set_updated_at
before update on public.signup_intents
for each row execute function public.set_updated_at();

create index signup_intents_token_hash_idx
  on public.signup_intents (token_hash);

create index signup_intents_user_id_idx
  on public.signup_intents (user_id);

create index signup_intents_status_idx
  on public.signup_intents (status);

create index signup_intents_expires_at_idx
  on public.signup_intents (expires_at);

alter table public.signup_intents enable row level security;

comment on table public.signup_intents is
  'Checkout funnel intents. No user-facing policies — trusted backend only.';
