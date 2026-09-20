-- =============================================================================
-- 20260920000015_personal_spiritual_workspace.sql
-- Private prayers, saved items, and journal/gratitude entries.
-- Additive. RLS own-row. No public read. No LLM. Text never belongs in analytics.
-- Conceptual rollback: drop policies then drop the three tables.
-- =============================================================================

create table public.user_prayers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  answered_at timestamptz,
  constraint user_prayers_body_len
    check (char_length(body) >= 1 and char_length(body) <= 2000),
  constraint user_prayers_status_allowed
    check (status in ('open', 'answered'))
);

comment on table public.user_prayers is
  'Owner private prayers. Never public. Never sent to models. Never logged as text.';

create trigger user_prayers_set_updated_at
before update on public.user_prayers
for each row execute function public.set_updated_at();

create index user_prayers_user_created_idx
  on public.user_prayers (user_id, created_at desc);

alter table public.user_prayers enable row level security;

create policy "user_prayers_select_own"
  on public.user_prayers for select
  using (auth.uid() = user_id);

create policy "user_prayers_insert_own"
  on public.user_prayers for insert
  with check (auth.uid() = user_id);

create policy "user_prayers_update_own"
  on public.user_prayers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_prayers_delete_own"
  on public.user_prayers for delete
  using (auth.uid() = user_id);

revoke all on table public.user_prayers from anon;
revoke all on table public.user_prayers from public;
grant select, insert, update, delete on table public.user_prayers to authenticated;
grant all on table public.user_prayers to service_role;

-- -----------------------------------------------------------------------------

create table public.user_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null,
  item_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_saved_items_type_allowed
    check (item_type in ('daily', 'journey_step', 'editorial_prayer', 'passage')),
  constraint user_saved_items_key_len
    check (char_length(item_key) >= 1 and char_length(item_key) <= 80),
  unique (user_id, item_type, item_key)
);

comment on table public.user_saved_items is
  'Owner favorites. Daily keys are YYYY-MM-DD. No private text.';

create index user_saved_items_user_created_idx
  on public.user_saved_items (user_id, created_at desc);

alter table public.user_saved_items enable row level security;

create policy "user_saved_items_select_own"
  on public.user_saved_items for select
  using (auth.uid() = user_id);

create policy "user_saved_items_insert_own"
  on public.user_saved_items for insert
  with check (auth.uid() = user_id);

create policy "user_saved_items_update_own"
  on public.user_saved_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_saved_items_delete_own"
  on public.user_saved_items for delete
  using (auth.uid() = user_id);

revoke all on table public.user_saved_items from anon;
revoke all on table public.user_saved_items from public;
grant select, insert, update, delete on table public.user_saved_items to authenticated;
grant all on table public.user_saved_items to service_role;

-- -----------------------------------------------------------------------------

create table public.user_private_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  body text not null,
  local_date date,
  journey_slug text,
  step_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_private_entries_kind_allowed
    check (kind in ('journal', 'gratitude', 'journey_step')),
  constraint user_private_entries_body_len
    check (char_length(body) >= 1 and char_length(body) <= 4000)
);

comment on table public.user_private_entries is
  'Owner journal/gratitude/optional journey notes. Never analytics, share, or LLM.';

create trigger user_private_entries_set_updated_at
before update on public.user_private_entries
for each row execute function public.set_updated_at();

create index user_private_entries_user_created_idx
  on public.user_private_entries (user_id, created_at desc);

alter table public.user_private_entries enable row level security;

create policy "user_private_entries_select_own"
  on public.user_private_entries for select
  using (auth.uid() = user_id);

create policy "user_private_entries_insert_own"
  on public.user_private_entries for insert
  with check (auth.uid() = user_id);

create policy "user_private_entries_update_own"
  on public.user_private_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_private_entries_delete_own"
  on public.user_private_entries for delete
  using (auth.uid() = user_id);

revoke all on table public.user_private_entries from anon;
revoke all on table public.user_private_entries from public;
grant select, insert, update, delete on table public.user_private_entries to authenticated;
grant all on table public.user_private_entries to service_role;
