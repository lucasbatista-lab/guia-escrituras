-- =============================================================================
-- 20260712000007_legal_consents.sql
-- User legal consent records. DO NOT apply in this iteration.
-- =============================================================================

create table public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null,
  source text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, terms_version, privacy_version)
);

create index legal_consents_user_id_idx
  on public.legal_consents (user_id);

alter table public.legal_consents enable row level security;

create policy "legal_consents_select_own"
  on public.legal_consents for select
  using (auth.uid() = user_id);

comment on table public.legal_consents is
  'Immutable consent records. Inserts only via trusted backend.';
