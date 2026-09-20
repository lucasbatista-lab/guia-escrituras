-- =============================================================================
-- 20260920000014_user_daily_interactions_and_product_events.sql
-- Daily editorial interactions + first-party product events.
-- Additive. RLS own-row. No private spiritual text in product_events.
-- Editorial daily content lives in the app registry (TypeScript), bible-ready.
-- =============================================================================

create table public.user_daily_interactions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  viewed_at timestamptz,
  completed_at timestamptz,
  saved_at timestamptz,
  shared_at timestamptz,
  checkin text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, local_date),
  constraint user_daily_interactions_checkin_allowed
    check (
      checkin is null
      or checkin in (
        'grateful',
        'peaceful',
        'anxious',
        'tired',
        'lost',
        'hopeful'
      )
    )
);

comment on table public.user_daily_interactions is
  'Owner daily ritual state. Check-in is a closed enum. No free-text prayer or journal.';

comment on column public.user_daily_interactions.local_date is
  'Civil date in America/Sao_Paulo as chosen by the app. Not a user timezone.';

comment on column public.user_daily_interactions.checkin is
  'Closed emotion/spiritual enum. Never send to analytics, logs, or share.';

create trigger user_daily_interactions_set_updated_at
before update on public.user_daily_interactions
for each row execute function public.set_updated_at();

create index user_daily_interactions_user_updated_idx
  on public.user_daily_interactions (user_id, updated_at desc);

alter table public.user_daily_interactions enable row level security;

create policy "user_daily_interactions_select_own"
  on public.user_daily_interactions for select
  using (auth.uid() = user_id);

create policy "user_daily_interactions_insert_own"
  on public.user_daily_interactions for insert
  with check (auth.uid() = user_id);

create policy "user_daily_interactions_update_own"
  on public.user_daily_interactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.user_daily_interactions from anon;
revoke all on table public.user_daily_interactions from public;
grant select, insert, update on table public.user_daily_interactions to authenticated;
grant select, insert, update, delete on table public.user_daily_interactions to service_role;

-- -----------------------------------------------------------------------------

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id text not null,
  event_name text not null,
  path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint product_events_event_id_len
    check (char_length(event_id) >= 8 and char_length(event_id) <= 64),
  constraint product_events_path_len
    check (char_length(path) >= 1 and char_length(path) <= 80),
  constraint product_events_event_name_allowed
    check (event_name in (
      'free_account_created',
      'daily_opened',
      'daily_content_viewed',
      'daily_completed',
      'daily_saved',
      'daily_shared',
      'checkin_completed',
      'premium_prompt_viewed',
      'premium_prompt_clicked',
      'chat_started',
      'first_chat_completed',
      'prayer_created',
      'prayer_marked_answered',
      'favorite_created',
      'journal_created'
    ))
);

comment on table public.product_events is
  'Authenticated product beacons. No message text, check-in, prayer, or journal body.';

create unique index product_events_event_id_uidx
  on public.product_events (event_id);

create index product_events_user_created_idx
  on public.product_events (user_id, created_at desc);

create index product_events_name_created_idx
  on public.product_events (event_name, created_at desc);

alter table public.product_events enable row level security;

create policy "product_events_select_own"
  on public.product_events for select
  using (auth.uid() = user_id);

create policy "product_events_insert_own"
  on public.product_events for insert
  with check (auth.uid() = user_id);

revoke all on table public.product_events from anon;
revoke all on table public.product_events from public;
grant select, insert on table public.product_events to authenticated;
grant select, insert, delete on table public.product_events to service_role;

-- Conceptual rollback: drop policies, then drop tables product_events and
-- user_daily_interactions. No historical migrations are edited.
