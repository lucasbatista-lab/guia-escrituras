-- =============================================================================
-- guia-escrituras — foundation schema
-- DO NOT apply remotely in this execution. Review and apply via Supabase CLI/dashboard.
-- Money values are stored in cents (integer). Admin via admin_roles (not profiles).
-- =============================================================================

create extension if not exists "pgcrypto";

-- updated_at trigger (secure, fixed search_path)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- RLS: users read/update only their own row. No admin flag here.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Users can select their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (not payment fields — none here)
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- traditions / tradition_policies
-- -----------------------------------------------------------------------------
create table public.traditions (
  key text primary key,
  label text not null,
  description text not null,
  allows_saints_content boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger traditions_set_updated_at
before update on public.traditions
for each row execute function public.set_updated_at();

alter table public.traditions enable row level security;

-- Catalog readable by authenticated users
create policy "traditions_select_authenticated"
  on public.traditions for select
  to authenticated
  using (active = true);

create table public.tradition_policies (
  id uuid primary key default gen_random_uuid(),
  tradition_key text not null references public.traditions (key) on delete cascade,
  guidance_notes text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tradition_key)
);

create trigger tradition_policies_set_updated_at
before update on public.tradition_policies
for each row execute function public.set_updated_at();

alter table public.tradition_policies enable row level security;

create policy "tradition_policies_select_authenticated"
  on public.tradition_policies for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- personas / persona_policies
-- -----------------------------------------------------------------------------
create table public.personas (
  key text primary key,
  name text not null,
  description text not null,
  source_basis text not null,
  active boolean not null default false,
  requires_saints_policy boolean not null default false,
  guidance_notes text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger personas_set_updated_at
before update on public.personas
for each row execute function public.set_updated_at();

alter table public.personas enable row level security;

create policy "personas_select_authenticated"
  on public.personas for select
  to authenticated
  using (active = true);

create table public.persona_policies (
  id uuid primary key default gen_random_uuid(),
  persona_key text not null references public.personas (key) on delete cascade,
  allowed_tradition_keys text[] default null,
  blocked_tradition_keys text[] default null,
  extra_guidance text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (persona_key)
);

create trigger persona_policies_set_updated_at
before update on public.persona_policies
for each row execute function public.set_updated_at();

alter table public.persona_policies enable row level security;

create policy "persona_policies_select_authenticated"
  on public.persona_policies for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- spiritual_profiles
-- RLS: own row only
-- -----------------------------------------------------------------------------
create table public.spiritual_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  tradition_key text not null references public.traditions (key),
  denomination text,
  preferred_bible_translation text,
  response_style text not null default 'reflective'
    check (response_style in ('pastoral', 'reflective', 'practical', 'study')),
  preferred_depth text not null default 'balanced'
    check (preferred_depth in ('brief', 'balanced', 'deep')),
  saints_content_enabled boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger spiritual_profiles_set_updated_at
before update on public.spiritual_profiles
for each row execute function public.set_updated_at();

create index spiritual_profiles_tradition_key_idx
  on public.spiritual_profiles (tradition_key);

alter table public.spiritual_profiles enable row level security;

create policy "spiritual_profiles_select_own"
  on public.spiritual_profiles for select
  using (auth.uid() = user_id);

create policy "spiritual_profiles_insert_own"
  on public.spiritual_profiles for insert
  with check (auth.uid() = user_id);

create policy "spiritual_profiles_update_own"
  on public.spiritual_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- plans / plan_entitlements
-- -----------------------------------------------------------------------------
create table public.plans (
  key text primary key,
  name text not null,
  tagline text not null,
  price_monthly_cents integer not null check (price_monthly_cents >= 0),
  currency text not null default 'BRL',
  cta_type text not null check (cta_type in ('checkout', 'request_access')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

create policy "plans_select_all_authenticated"
  on public.plans for select
  to authenticated
  using (active = true);

-- Allow anon read of public plan catalog for marketing pages via server
create policy "plans_select_anon"
  on public.plans for select
  to anon
  using (active = true);

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null references public.plans (key) on delete cascade,
  entitlement_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (plan_key, entitlement_key)
);

create index plan_entitlements_plan_key_idx
  on public.plan_entitlements (plan_key);

alter table public.plan_entitlements enable row level security;

create policy "plan_entitlements_select_authenticated"
  on public.plan_entitlements for select
  to authenticated
  using (true);

create policy "plan_entitlements_select_anon"
  on public.plan_entitlements for select
  to anon
  using (true);

-- -----------------------------------------------------------------------------
-- subscriptions
-- RLS: users can SELECT own rows. INSERT/UPDATE of payment fields only via service role.
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_key text not null references public.plans (key),
  status text not null
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

-- Users may read their own subscription; cannot insert/update payment status
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for authenticated → service role / backend only

-- -----------------------------------------------------------------------------
-- conversations / messages / conversation_summaries
-- -----------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  persona_key text references public.personas (key),
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create index conversations_user_id_idx on public.conversations (user_id);
create index conversations_created_at_idx on public.conversations (created_at);

alter table public.conversations enable row level security;

create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations_insert_own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "conversations_update_own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations_delete_own"
  on public.conversations for delete
  using (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  biblical_references jsonb not null default '[]'::jsonb,
  request_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_user_id_idx on public.messages (user_id);
create index messages_created_at_idx on public.messages (created_at);

alter table public.messages enable row level security;

create policy "messages_select_own"
  on public.messages for select
  using (auth.uid() = user_id);

create policy "messages_insert_own"
  on public.messages for insert
  with check (auth.uid() = user_id);

-- No update/delete for users → preserves integrity of conversation history

create table public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id)
);

create trigger conversation_summaries_set_updated_at
before update on public.conversation_summaries
for each row execute function public.set_updated_at();

create index conversation_summaries_user_id_idx
  on public.conversation_summaries (user_id);

alter table public.conversation_summaries enable row level security;

create policy "conversation_summaries_select_own"
  on public.conversation_summaries for select
  using (auth.uid() = user_id);

create policy "conversation_summaries_insert_own"
  on public.conversation_summaries for insert
  with check (auth.uid() = user_id);

create policy "conversation_summaries_update_own"
  on public.conversation_summaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- usage_events (append-only for users) / usage_monthly
-- -----------------------------------------------------------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id),
  conversation_id uuid references public.conversations (id),
  request_id text not null,
  feature_type text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd_micros bigint not null default 0,
  estimated_cost_brl_cents integer not null default 0,
  latency_ms integer not null default 0,
  success boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
  -- no updated_at: append-only
);

create index usage_events_user_id_idx on public.usage_events (user_id);
create index usage_events_subscription_id_idx on public.usage_events (subscription_id);
create index usage_events_conversation_id_idx on public.usage_events (conversation_id);
create index usage_events_created_at_idx on public.usage_events (created_at);
create index usage_events_request_id_idx on public.usage_events (request_id);

alter table public.usage_events enable row level security;

-- Users can read own usage events; insert via backend preferred, but allow insert own
create policy "usage_events_select_own"
  on public.usage_events for select
  using (auth.uid() = user_id);

create policy "usage_events_insert_own"
  on public.usage_events for insert
  with check (auth.uid() = user_id);

-- No update/delete policies → append-only for common users

create table public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month text not null, -- YYYY-MM
  used_brl_cents integer not null default 0,
  request_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, year_month)
);

create trigger usage_monthly_set_updated_at
before update on public.usage_monthly
for each row execute function public.set_updated_at();

create index usage_monthly_user_id_idx on public.usage_monthly (user_id);

alter table public.usage_monthly enable row level security;

create policy "usage_monthly_select_own"
  on public.usage_monthly for select
  using (auth.uid() = user_id);

-- Updates to aggregates should be service-role / secured functions only

-- -----------------------------------------------------------------------------
-- referrals
-- -----------------------------------------------------------------------------
create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger referral_codes_set_updated_at
before update on public.referral_codes
for each row execute function public.set_updated_at();

create index referral_codes_owner_user_id_idx on public.referral_codes (owner_user_id);
create index referral_codes_code_idx on public.referral_codes (code);

alter table public.referral_codes enable row level security;

create policy "referral_codes_select_own"
  on public.referral_codes for select
  using (auth.uid() = owner_user_id);

create policy "referral_codes_insert_own"
  on public.referral_codes for insert
  with check (auth.uid() = owner_user_id);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null references public.referral_codes (code),
  referrer_user_id uuid not null references public.profiles (id),
  referred_user_id uuid not null references public.profiles (id),
  status text not null default 'attributed'
    check (status in (
      'attributed',
      'first_payment_confirmed',
      'second_payment_confirmed',
      'reward_pending',
      'reward_approved',
      'reward_paid',
      'rejected'
    )),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (referred_user_id),
  check (referrer_user_id <> referred_user_id)
);

create trigger referral_attributions_set_updated_at
before update on public.referral_attributions
for each row execute function public.set_updated_at();

create index referral_attributions_referrer_user_id_idx
  on public.referral_attributions (referrer_user_id);
create index referral_attributions_referral_code_idx
  on public.referral_attributions (referral_code);

alter table public.referral_attributions enable row level security;

create policy "referral_attributions_select_own"
  on public.referral_attributions for select
  using (
    auth.uid() = referrer_user_id
    or auth.uid() = referred_user_id
  );

-- Status transitions should be service-role only (no user update policy)

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.referral_attributions (id) on delete cascade,
  amount_brl_cents integer not null check (amount_brl_cents >= 0),
  status text not null default 'reward_pending'
    check (status in ('reward_pending', 'reward_approved', 'reward_paid', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger referral_rewards_set_updated_at
before update on public.referral_rewards
for each row execute function public.set_updated_at();

create index referral_rewards_attribution_id_idx
  on public.referral_rewards (attribution_id);

alter table public.referral_rewards enable row level security;

create policy "referral_rewards_select_via_attribution"
  on public.referral_rewards for select
  using (
    exists (
      select 1 from public.referral_attributions a
      where a.id = attribution_id
        and a.referrer_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- custom_content_orders
-- -----------------------------------------------------------------------------
create table public.custom_content_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  brief text not null,
  status text not null default 'requested'
    check (status in ('requested', 'in_progress', 'delivered', 'canceled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger custom_content_orders_set_updated_at
before update on public.custom_content_orders
for each row execute function public.set_updated_at();

create index custom_content_orders_user_id_idx
  on public.custom_content_orders (user_id);

alter table public.custom_content_orders enable row level security;

create policy "custom_content_orders_select_own"
  on public.custom_content_orders for select
  using (auth.uid() = user_id);

create policy "custom_content_orders_insert_own"
  on public.custom_content_orders for insert
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- daily_reports (aggregates only — no PII / message content)
-- -----------------------------------------------------------------------------
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  aggregates jsonb not null,
  interpretation jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger daily_reports_set_updated_at
before update on public.daily_reports
for each row execute function public.set_updated_at();

alter table public.daily_reports enable row level security;

-- No policies for authenticated users — admin access via service role / admin RPC

-- -----------------------------------------------------------------------------
-- admin_roles — separate from profiles
-- -----------------------------------------------------------------------------
create table public.admin_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'ops', 'finance')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger admin_roles_set_updated_at
before update on public.admin_roles
for each row execute function public.set_updated_at();

alter table public.admin_roles enable row level security;

-- Users can read their own admin role row (to gate UI). No self-elevation.
create policy "admin_roles_select_own"
  on public.admin_roles for select
  using (auth.uid() = user_id);

-- Inserts/updates only via service role

-- Helper for admin checks in future policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
      and role in ('admin', 'ops', 'finance')
  );
$$;

-- Admin can read daily_reports
create policy "daily_reports_select_admin"
  on public.daily_reports for select
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Profile bootstrap on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
