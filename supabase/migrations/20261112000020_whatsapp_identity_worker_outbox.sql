-- =============================================================================
-- 20261112000020_whatsapp_identity_worker_outbox.sql
-- Additive: WhatsApp identity linking, durable claim columns, outbound outbox.
-- Does NOT call Meta. Does NOT alter Stripe/plans. Service-role only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. user_channel_identities
-- -----------------------------------------------------------------------------
create table if not exists public.user_channel_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null
    check (channel in ('whatsapp')),
  external_id text not null,
  status text not null
    check (status in ('active', 'revoked')),
  verification_method text not null
    check (verification_method in ('authenticated_link_code')),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_channel_identities_external_active_uidx
    unique (channel, external_id, status)
    deferrable initially immediate
);

-- One active WhatsApp per user (partial unique).
create unique index if not exists user_channel_identities_user_active_uidx
  on public.user_channel_identities (user_id, channel)
  where status = 'active';

-- One active binding per external id (partial unique — stronger than composite with revoked).
create unique index if not exists user_channel_identities_external_active_only_uidx
  on public.user_channel_identities (channel, external_id)
  where status = 'active';

create index if not exists user_channel_identities_user_status_idx
  on public.user_channel_identities (user_id, status);

comment on table public.user_channel_identities is
  'Verified channel identities (WhatsApp). Active external_id unique. Service-role only.';

alter table public.user_channel_identities enable row level security;
revoke all on table public.user_channel_identities from public;
revoke all on table public.user_channel_identities from anon;
revoke all on table public.user_channel_identities from authenticated;
grant select, insert, update, delete on table public.user_channel_identities to service_role;

-- Drop the non-partial unique that included status (revoked rows would collide awkwardly).
alter table public.user_channel_identities
  drop constraint if exists user_channel_identities_external_active_uidx;

-- -----------------------------------------------------------------------------
-- B. channel_identity_link_tokens
-- -----------------------------------------------------------------------------
create table if not exists public.channel_identity_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null
    check (channel in ('whatsapp')),
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  max_attempts integer not null default 5
    check (max_attempts > 0),
  invalidated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists channel_identity_link_tokens_hash_idx
  on public.channel_identity_link_tokens (token_hash)
  where consumed_at is null and invalidated_at is null;

create index if not exists channel_identity_link_tokens_user_channel_idx
  on public.channel_identity_link_tokens (user_id, channel, created_at desc);

comment on table public.channel_identity_link_tokens is
  'Single-use hashed link codes for authenticated WhatsApp binding. Never store plaintext.';

alter table public.channel_identity_link_tokens enable row level security;
revoke all on table public.channel_identity_link_tokens from public;
revoke all on table public.channel_identity_link_tokens from anon;
revoke all on table public.channel_identity_link_tokens from authenticated;
grant select, insert, update, delete on table public.channel_identity_link_tokens to service_role;

-- -----------------------------------------------------------------------------
-- C. whatsapp_outbound_messages
-- -----------------------------------------------------------------------------
create table if not exists public.whatsapp_outbound_messages (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null
    references public.user_channel_identities (id) on delete cascade,
  idempotency_key text not null,
  message_type text not null
    check (message_type in ('text', 'link_confirmation')),
  body_text text not null
    check (char_length(body_text) > 0 and char_length(body_text) <= 4096),
  status text not null
    check (status in (
      'pending',
      'sending',
      'sent',
      'retry',
      'failed',
      'cancelled'
    )),
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  available_after timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  locked_until timestamptz,
  provider_message_id text,
  sent_at timestamptz,
  expires_at timestamptz not null,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint whatsapp_outbound_messages_idempotency_uidx
    unique (idempotency_key)
);

create index if not exists whatsapp_outbound_messages_status_available_idx
  on public.whatsapp_outbound_messages (status, available_after);

create index if not exists whatsapp_outbound_messages_identity_status_idx
  on public.whatsapp_outbound_messages (identity_id, status);

comment on table public.whatsapp_outbound_messages is
  'Durable WhatsApp outbound outbox. No Graph send in this wave. Service-role only.';

alter table public.whatsapp_outbound_messages enable row level security;
revoke all on table public.whatsapp_outbound_messages from public;
revoke all on table public.whatsapp_outbound_messages from anon;
revoke all on table public.whatsapp_outbound_messages from authenticated;
grant select, insert, update, delete on table public.whatsapp_outbound_messages to service_role;

-- -----------------------------------------------------------------------------
-- D. Adjust whatsapp_inbound_events for durable worker
-- -----------------------------------------------------------------------------
alter table public.whatsapp_inbound_events
  add column if not exists bundle_id uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists locked_until timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists next_attempt_at timestamptz;

create index if not exists whatsapp_inbound_events_claim_idx
  on public.whatsapp_inbound_events (status, available_after, next_attempt_at)
  where status in ('pending', 'bundled', 'retry');

create index if not exists whatsapp_inbound_events_bundle_idx
  on public.whatsapp_inbound_events (bundle_id)
  where bundle_id is not null;

-- Allow retry status if not already present (safe additive via check recreate).
alter table public.whatsapp_inbound_events
  drop constraint if exists whatsapp_inbound_events_status_check;

alter table public.whatsapp_inbound_events
  add constraint whatsapp_inbound_events_status_check
  check (status in (
    'pending',
    'bundled',
    'processing',
    'processed',
    'ignored',
    'failed',
    'pending_identity',
    'retry'
  ));

-- -----------------------------------------------------------------------------
-- E. Atomic RPCs (SECURITY DEFINER, service_role only)
-- -----------------------------------------------------------------------------

-- Consume link token + create identity atomically.
create or replace function public.whatsapp_consume_link_token(
  p_token_hash text,
  p_external_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.channel_identity_link_tokens%rowtype;
  v_identity_id uuid;
  v_existing public.user_channel_identities%rowtype;
  v_user_other uuid;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('result', 'token_invalid');
  end if;
  if p_external_id is null or length(trim(p_external_id)) < 3 then
    return jsonb_build_object('result', 'token_invalid');
  end if;

  select * into v_token
  from public.channel_identity_link_tokens
  where token_hash = p_token_hash
    and channel = 'whatsapp'
    and invalidated_at is null
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('result', 'token_invalid');
  end if;

  if v_token.consumed_at is not null then
    return jsonb_build_object('result', 'token_consumed');
  end if;

  if v_token.expires_at <= timezone('utc', now()) then
    return jsonb_build_object('result', 'token_expired');
  end if;

  if v_token.attempt_count >= v_token.max_attempts then
    return jsonb_build_object('result', 'attempts_exceeded');
  end if;

  -- Increment attempt before further checks (failed binds count).
  update public.channel_identity_link_tokens
  set attempt_count = attempt_count + 1,
      updated_at = timezone('utc', now())
  where id = v_token.id;

  -- External already active for another user?
  select * into v_existing
  from public.user_channel_identities
  where channel = 'whatsapp'
    and external_id = p_external_id
    and status = 'active'
  for update;

  if found then
    if v_existing.user_id = v_token.user_id then
      update public.channel_identity_link_tokens
      set consumed_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
      where id = v_token.id;
      return jsonb_build_object(
        'result', 'already_linked_same_user',
        'identity_id', v_existing.id,
        'user_id', v_token.user_id
      );
    end if;
    return jsonb_build_object('result', 'external_identity_conflict');
  end if;

  -- User already has a different active WhatsApp?
  select user_id into v_user_other
  from public.user_channel_identities
  where user_id = v_token.user_id
    and channel = 'whatsapp'
    and status = 'active'
    and external_id <> p_external_id
  limit 1;

  if found then
    return jsonb_build_object('result', 'user_already_has_other_identity');
  end if;

  insert into public.user_channel_identities (
    user_id, channel, external_id, status, verification_method, verified_at
  ) values (
    v_token.user_id, 'whatsapp', p_external_id, 'active',
    'authenticated_link_code', timezone('utc', now())
  )
  returning id into v_identity_id;

  update public.channel_identity_link_tokens
  set consumed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = v_token.id;

  -- Invalidate other active tokens for this user/channel.
  update public.channel_identity_link_tokens
  set invalidated_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where user_id = v_token.user_id
    and channel = 'whatsapp'
    and id <> v_token.id
    and consumed_at is null
    and invalidated_at is null;

  return jsonb_build_object(
    'result', 'linked',
    'identity_id', v_identity_id,
    'user_id', v_token.user_id
  );
exception
  when unique_violation then
    return jsonb_build_object('result', 'external_identity_conflict');
  when others then
    return jsonb_build_object('result', 'internal_error');
end;
$$;

revoke all on function public.whatsapp_consume_link_token(text, text) from public;
revoke all on function public.whatsapp_consume_link_token(text, text) from anon;
revoke all on function public.whatsapp_consume_link_token(text, text) from authenticated;
grant execute on function public.whatsapp_consume_link_token(text, text) to service_role;

-- Claim next processable inbound rows for one sender bundle (SKIP LOCKED).
create or replace function public.whatsapp_claim_inbound_bundle(
  p_lease_seconds integer default 90,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender text;
  v_bundle_id uuid := gen_random_uuid();
  v_lease_until timestamptz;
  v_ids uuid[];
  v_now timestamptz := timezone('utc', now());
begin
  if p_lease_seconds is null or p_lease_seconds < 30 then
    p_lease_seconds := 90;
  end if;
  if p_limit is null or p_limit < 1 then
    p_limit := 20;
  end if;
  if p_limit > 50 then
    p_limit := 50;
  end if;

  v_lease_until := v_now + make_interval(secs => p_lease_seconds);

  -- Pick one eligible sender (oldest available message).
  select e.external_sender_id into v_sender
  from public.whatsapp_inbound_events e
  where e.message_type = 'text'
    and e.status in ('pending', 'bundled', 'retry')
    and e.available_after <= v_now
    and (e.next_attempt_at is null or e.next_attempt_at <= v_now)
    and (e.locked_until is null or e.locked_until <= v_now)
  order by e.received_at asc
  limit 1
  for update skip locked;

  if v_sender is null then
    return jsonb_build_object('claimed', false);
  end if;

  with picked as (
    select e.id
    from public.whatsapp_inbound_events e
    where e.external_sender_id = v_sender
      and e.message_type = 'text'
      and e.status in ('pending', 'bundled', 'retry')
      and e.available_after <= v_now
      and (e.next_attempt_at is null or e.next_attempt_at <= v_now)
      and (e.locked_until is null or e.locked_until <= v_now)
    order by e.received_at asc, e.provider_message_id asc
    limit p_limit
    for update skip locked
  )
  update public.whatsapp_inbound_events e
  set status = 'processing',
      bundle_id = v_bundle_id,
      claimed_at = v_now,
      locked_until = v_lease_until,
      processing_started_at = v_now,
      attempt_count = e.attempt_count + 1,
      updated_at = v_now
  from picked
  where e.id = picked.id;

  select coalesce(array_agg(e.id order by e.received_at, e.provider_message_id), '{}')
  into v_ids
  from public.whatsapp_inbound_events e
  where e.bundle_id = v_bundle_id
    and e.status = 'processing';

  if v_ids is null or array_length(v_ids, 1) is null then
    return jsonb_build_object('claimed', false);
  end if;

  return jsonb_build_object(
    'claimed', true,
    'bundle_id', v_bundle_id,
    'event_ids', to_jsonb(v_ids),
    'locked_until', v_lease_until
  );
end;
$$;

revoke all on function public.whatsapp_claim_inbound_bundle(integer, integer) from public;
revoke all on function public.whatsapp_claim_inbound_bundle(integer, integer) from anon;
revoke all on function public.whatsapp_claim_inbound_bundle(integer, integer) from authenticated;
grant execute on function public.whatsapp_claim_inbound_bundle(integer, integer) to service_role;

create or replace function public.whatsapp_complete_inbound_bundle(
  p_bundle_id uuid,
  p_status text default 'processed',
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_count integer;
begin
  if p_bundle_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_bundle');
  end if;
  if p_status not in ('processed', 'pending_identity', 'ignored', 'failed') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  update public.whatsapp_inbound_events
  set status = p_status,
      completed_at = v_now,
      processed_at = case when p_status in ('processed', 'ignored', 'failed', 'pending_identity')
        then v_now else processed_at end,
      locked_until = null,
      error_code = p_error_code,
      updated_at = v_now
  where bundle_id = p_bundle_id
    and status = 'processing';

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function public.whatsapp_complete_inbound_bundle(uuid, text, text) from public;
revoke all on function public.whatsapp_complete_inbound_bundle(uuid, text, text) from anon;
revoke all on function public.whatsapp_complete_inbound_bundle(uuid, text, text) from authenticated;
grant execute on function public.whatsapp_complete_inbound_bundle(uuid, text, text) to service_role;

create or replace function public.whatsapp_retry_inbound_bundle(
  p_bundle_id uuid,
  p_backoff_seconds integer,
  p_error_code text default null,
  p_max_attempts integer default 8
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_max integer;
  v_failed integer := 0;
  v_retried integer := 0;
begin
  if p_bundle_id is null then
    return jsonb_build_object('ok', false);
  end if;
  if p_backoff_seconds is null or p_backoff_seconds < 1 then
    p_backoff_seconds := 5;
  end if;
  p_max_attempts := coalesce(p_max_attempts, 8);

  update public.whatsapp_inbound_events
  set status = case
        when attempt_count >= p_max_attempts then 'failed'
        else 'retry'
      end,
      next_attempt_at = case
        when attempt_count >= p_max_attempts then null
        else v_now + make_interval(secs => p_backoff_seconds)
      end,
      locked_until = null,
      error_code = p_error_code,
      completed_at = case when attempt_count >= p_max_attempts then v_now else null end,
      processed_at = case when attempt_count >= p_max_attempts then v_now else processed_at end,
      updated_at = v_now
  where bundle_id = p_bundle_id
    and status = 'processing';

  select
    count(*) filter (where status = 'failed'),
    count(*) filter (where status = 'retry')
  into v_failed, v_retried
  from public.whatsapp_inbound_events
  where bundle_id = p_bundle_id;

  return jsonb_build_object(
    'ok', true,
    'failed', v_failed,
    'retried', v_retried
  );
end;
$$;

revoke all on function public.whatsapp_retry_inbound_bundle(uuid, integer, text, integer) from public;
revoke all on function public.whatsapp_retry_inbound_bundle(uuid, integer, text, integer) from anon;
revoke all on function public.whatsapp_retry_inbound_bundle(uuid, integer, text, integer) from authenticated;
grant execute on function public.whatsapp_retry_inbound_bundle(uuid, integer, text, integer) to service_role;

-- Release expired leases back to retryable state.
create or replace function public.whatsapp_release_expired_inbound_leases()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_count integer;
begin
  update public.whatsapp_inbound_events
  set status = 'retry',
      next_attempt_at = v_now,
      locked_until = null,
      updated_at = v_now,
      error_code = coalesce(error_code, 'lease_expired')
  where status = 'processing'
    and locked_until is not null
    and locked_until <= v_now;

  get diagnostics v_count = row_count;
  return jsonb_build_object('released', v_count);
end;
$$;

revoke all on function public.whatsapp_release_expired_inbound_leases() from public;
revoke all on function public.whatsapp_release_expired_inbound_leases() from anon;
revoke all on function public.whatsapp_release_expired_inbound_leases() from authenticated;
grant execute on function public.whatsapp_release_expired_inbound_leases() to service_role;
