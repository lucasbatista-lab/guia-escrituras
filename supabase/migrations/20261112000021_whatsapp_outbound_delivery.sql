-- =============================================================================
-- 20261112000021_whatsapp_outbound_delivery.sql
-- Additive: outbound delivery states, claim/complete RPCs, status reconcile.
-- Does NOT call Meta. Service-role only. No raw payloads stored.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Expand outbound status check + new columns
-- -----------------------------------------------------------------------------
alter table public.whatsapp_outbound_messages
  drop constraint if exists whatsapp_outbound_messages_status_check;

alter table public.whatsapp_outbound_messages
  add constraint whatsapp_outbound_messages_status_check
  check (status in (
    'pending',
    'sending',
    'sent',
    'delivered',
    'read',
    'retry',
    'delivery_unknown',
    'failed',
    'cancelled'
  ));

alter table public.whatsapp_outbound_messages
  add column if not exists last_attempt_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists provider_error_code text,
  add column if not exists delivery_status_updated_at timestamptz,
  add column if not exists claim_token uuid;

-- Unique provider_message_id when present (partial).
create unique index if not exists whatsapp_outbound_messages_provider_msg_uidx
  on public.whatsapp_outbound_messages (provider_message_id)
  where provider_message_id is not null;

create index if not exists whatsapp_outbound_messages_claim_idx
  on public.whatsapp_outbound_messages (status, available_after)
  where status in ('pending', 'retry');

comment on column public.whatsapp_outbound_messages.claim_token is
  'Opaque lease token; complete/retry must match to prevent stale workers.';

-- -----------------------------------------------------------------------------
-- B. Claim outbound messages (SKIP LOCKED)
-- -----------------------------------------------------------------------------
create or replace function public.whatsapp_claim_outbound_messages(
  p_lease_seconds integer default 90,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_lease_until timestamptz;
  v_claim_token uuid := gen_random_uuid();
  v_rows jsonb;
begin
  if p_lease_seconds is null or p_lease_seconds < 30 then
    p_lease_seconds := 90;
  end if;
  if p_limit is null or p_limit < 1 then
    p_limit := 5;
  end if;
  if p_limit > 20 then
    p_limit := 20;
  end if;

  v_lease_until := v_now + make_interval(secs => p_lease_seconds);

  -- Cancel expired pending/retry that can never send.
  update public.whatsapp_outbound_messages o
  set status = 'cancelled',
      error_code = coalesce(o.error_code, 'expired'),
      locked_at = null,
      locked_until = null,
      claim_token = null,
      updated_at = v_now
  where o.status in ('pending', 'retry')
    and o.expires_at <= v_now;

  with picked as (
    select o.id
    from public.whatsapp_outbound_messages o
    inner join public.user_channel_identities i
      on i.id = o.identity_id
     and i.status = 'active'
     and i.channel = 'whatsapp'
    where o.status in ('pending', 'retry')
      and o.available_after <= v_now
      and o.expires_at > v_now
      and (o.locked_until is null or o.locked_until <= v_now)
    order by o.available_after asc, o.created_at asc, o.id asc
    limit p_limit
    for update of o skip locked
  )
  update public.whatsapp_outbound_messages o
  set status = 'sending',
      attempt_count = o.attempt_count + 1,
      last_attempt_at = v_now,
      locked_at = v_now,
      locked_until = v_lease_until,
      claim_token = v_claim_token,
      updated_at = v_now
  from picked
  where o.id = picked.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'identity_id', o.identity_id,
        'external_id', i.external_id,
        'body_text', o.body_text,
        'message_type', o.message_type,
        'idempotency_key', o.idempotency_key,
        'attempt_count', o.attempt_count,
        'claim_token', o.claim_token,
        'locked_until', o.locked_until
      )
      order by o.available_after asc, o.created_at asc, o.id asc
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.whatsapp_outbound_messages o
  inner join public.user_channel_identities i on i.id = o.identity_id
  where o.claim_token = v_claim_token
    and o.status = 'sending';

  return jsonb_build_object(
    'claimed', jsonb_array_length(v_rows) > 0,
    'claim_token', v_claim_token,
    'items', v_rows
  );
end;
$$;

revoke all on function public.whatsapp_claim_outbound_messages(integer, integer) from public;
revoke all on function public.whatsapp_claim_outbound_messages(integer, integer) from anon;
revoke all on function public.whatsapp_claim_outbound_messages(integer, integer) from authenticated;
grant execute on function public.whatsapp_claim_outbound_messages(integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- C. Complete send
-- -----------------------------------------------------------------------------
create or replace function public.whatsapp_complete_outbound_send(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_provider_message_id text
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
  if p_outbox_id is null or p_claim_token is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_args');
  end if;
  if p_provider_message_id is null or length(trim(p_provider_message_id)) < 3 then
    return jsonb_build_object('ok', false, 'reason', 'missing_provider_id');
  end if;

  update public.whatsapp_outbound_messages
  set status = 'sent',
      provider_message_id = trim(p_provider_message_id),
      sent_at = coalesce(sent_at, v_now),
      locked_at = null,
      locked_until = null,
      claim_token = null,
      error_code = null,
      delivery_status_updated_at = v_now,
      updated_at = v_now
  where id = p_outbox_id
    and status = 'sending'
    and claim_token = p_claim_token;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'stale_or_missing_claim');
  end if;
  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'provider_id_conflict');
end;
$$;

revoke all on function public.whatsapp_complete_outbound_send(uuid, uuid, text) from public;
revoke all on function public.whatsapp_complete_outbound_send(uuid, uuid, text) from anon;
revoke all on function public.whatsapp_complete_outbound_send(uuid, uuid, text) from authenticated;
grant execute on function public.whatsapp_complete_outbound_send(uuid, uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- D. Retry / fail / delivery_unknown / cancel / release
-- -----------------------------------------------------------------------------
create or replace function public.whatsapp_schedule_outbound_retry(
  p_outbox_id uuid,
  p_claim_token uuid,
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
  v_attempts integer;
  v_status text;
begin
  if p_outbox_id is null or p_claim_token is null then
    return jsonb_build_object('ok', false);
  end if;
  if p_backoff_seconds is null or p_backoff_seconds < 1 then
    p_backoff_seconds := 5;
  end if;
  p_max_attempts := coalesce(p_max_attempts, 8);

  select attempt_count into v_attempts
  from public.whatsapp_outbound_messages
  where id = p_outbox_id
    and status = 'sending'
    and claim_token = p_claim_token
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'stale_or_missing_claim');
  end if;

  if v_attempts >= p_max_attempts then
    v_status := 'failed';
    update public.whatsapp_outbound_messages
    set status = 'failed',
        failed_at = v_now,
        locked_at = null,
        locked_until = null,
        claim_token = null,
        error_code = coalesce(p_error_code, 'max_attempts'),
        updated_at = v_now
    where id = p_outbox_id
      and claim_token = p_claim_token;
  else
    v_status := 'retry';
    update public.whatsapp_outbound_messages
    set status = 'retry',
        available_after = v_now + make_interval(secs => p_backoff_seconds),
        locked_at = null,
        locked_until = null,
        claim_token = null,
        error_code = p_error_code,
        updated_at = v_now
    where id = p_outbox_id
      and claim_token = p_claim_token;
  end if;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

revoke all on function public.whatsapp_schedule_outbound_retry(uuid, uuid, integer, text, integer) from public;
revoke all on function public.whatsapp_schedule_outbound_retry(uuid, uuid, integer, text, integer) from anon;
revoke all on function public.whatsapp_schedule_outbound_retry(uuid, uuid, integer, text, integer) from authenticated;
grant execute on function public.whatsapp_schedule_outbound_retry(uuid, uuid, integer, text, integer) to service_role;

create or replace function public.whatsapp_mark_outbound_delivery_unknown(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_error_code text default 'meta_timeout_ambiguous'
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
  if p_outbox_id is null or p_claim_token is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.whatsapp_outbound_messages
  set status = 'delivery_unknown',
      locked_at = null,
      locked_until = null,
      claim_token = null,
      error_code = coalesce(p_error_code, 'meta_timeout_ambiguous'),
      updated_at = v_now
  where id = p_outbox_id
    and status = 'sending'
    and claim_token = p_claim_token;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', v_count > 0);
end;
$$;

revoke all on function public.whatsapp_mark_outbound_delivery_unknown(uuid, uuid, text) from public;
revoke all on function public.whatsapp_mark_outbound_delivery_unknown(uuid, uuid, text) from anon;
revoke all on function public.whatsapp_mark_outbound_delivery_unknown(uuid, uuid, text) from authenticated;
grant execute on function public.whatsapp_mark_outbound_delivery_unknown(uuid, uuid, text) to service_role;

create or replace function public.whatsapp_mark_outbound_failed(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_error_code text default 'meta_invalid_request'
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
  if p_outbox_id is null or p_claim_token is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.whatsapp_outbound_messages
  set status = 'failed',
      failed_at = v_now,
      locked_at = null,
      locked_until = null,
      claim_token = null,
      error_code = coalesce(p_error_code, 'meta_invalid_request'),
      updated_at = v_now
  where id = p_outbox_id
    and status = 'sending'
    and claim_token = p_claim_token;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', v_count > 0);
end;
$$;

revoke all on function public.whatsapp_mark_outbound_failed(uuid, uuid, text) from public;
revoke all on function public.whatsapp_mark_outbound_failed(uuid, uuid, text) from anon;
revoke all on function public.whatsapp_mark_outbound_failed(uuid, uuid, text) from authenticated;
grant execute on function public.whatsapp_mark_outbound_failed(uuid, uuid, text) to service_role;

create or replace function public.whatsapp_cancel_outbound_send(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_error_code text default 'identity_revoked'
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
  update public.whatsapp_outbound_messages
  set status = 'cancelled',
      locked_at = null,
      locked_until = null,
      claim_token = null,
      error_code = coalesce(p_error_code, 'identity_revoked'),
      updated_at = v_now
  where id = p_outbox_id
    and status = 'sending'
    and claim_token = p_claim_token;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', v_count > 0);
end;
$$;

revoke all on function public.whatsapp_cancel_outbound_send(uuid, uuid, text) from public;
revoke all on function public.whatsapp_cancel_outbound_send(uuid, uuid, text) from anon;
revoke all on function public.whatsapp_cancel_outbound_send(uuid, uuid, text) from authenticated;
grant execute on function public.whatsapp_cancel_outbound_send(uuid, uuid, text) to service_role;

create or replace function public.whatsapp_release_expired_outbound_leases()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_count integer;
begin
  update public.whatsapp_outbound_messages
  set status = 'retry',
      available_after = v_now,
      locked_at = null,
      locked_until = null,
      claim_token = null,
      error_code = coalesce(error_code, 'lease_expired'),
      updated_at = v_now
  where status = 'sending'
    and locked_until is not null
    and locked_until <= v_now;

  get diagnostics v_count = row_count;
  return jsonb_build_object('released', v_count);
end;
$$;

revoke all on function public.whatsapp_release_expired_outbound_leases() from public;
revoke all on function public.whatsapp_release_expired_outbound_leases() from anon;
revoke all on function public.whatsapp_release_expired_outbound_leases() from authenticated;
grant execute on function public.whatsapp_release_expired_outbound_leases() to service_role;

-- -----------------------------------------------------------------------------
-- E. Apply delivery status (monotonic)
-- -----------------------------------------------------------------------------
create or replace function public.whatsapp_apply_delivery_status(
  p_provider_message_id text,
  p_status text,
  p_event_at timestamptz default null,
  p_provider_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_event timestamptz := coalesce(p_event_at, v_now);
  v_row public.whatsapp_outbound_messages%rowtype;
  v_rank_current integer;
  v_rank_incoming integer;
begin
  if p_provider_message_id is null or length(trim(p_provider_message_id)) < 3 then
    return jsonb_build_object('applied', false, 'reason', 'missing_provider_id');
  end if;
  if p_status not in ('sent', 'delivered', 'read', 'failed') then
    return jsonb_build_object('applied', false, 'reason', 'unknown_status');
  end if;

  select * into v_row
  from public.whatsapp_outbound_messages
  where provider_message_id = trim(p_provider_message_id)
  for update;

  if not found then
    return jsonb_build_object('applied', false, 'reason', 'unknown_provider_id');
  end if;

  -- Rank: cancelled/failed terminal for send path; delivery ladder sent<delivered<read
  v_rank_current := case v_row.status
    when 'sent' then 1
    when 'delivered' then 2
    when 'read' then 3
    when 'failed' then 10
    when 'delivery_unknown' then 0
    when 'sending' then 0
    when 'pending' then 0
    when 'retry' then 0
    when 'cancelled' then 99
    else 0
  end;

  v_rank_incoming := case p_status
    when 'sent' then 1
    when 'delivered' then 2
    when 'read' then 3
    when 'failed' then 10
    else 0
  end;

  -- cancelled never changes
  if v_row.status = 'cancelled' then
    return jsonb_build_object('applied', false, 'reason', 'cancelled');
  end if;

  -- failed after read does not regress
  if v_row.status = 'read' and p_status = 'failed' then
    return jsonb_build_object('applied', false, 'reason', 'no_regress_read');
  end if;

  -- already at same or higher delivery rank (idempotent / no regress)
  if p_status in ('sent', 'delivered', 'read') then
    if v_rank_current >= v_rank_incoming and v_row.status in ('sent', 'delivered', 'read') then
      return jsonb_build_object('applied', false, 'reason', 'idempotent_or_no_regress');
    end if;
  end if;

  -- failed after failed is idempotent
  if v_row.status = 'failed' and p_status = 'failed' then
    return jsonb_build_object('applied', false, 'reason', 'idempotent');
  end if;

  if p_status = 'sent' then
    update public.whatsapp_outbound_messages
    set status = case
          when status in ('delivered', 'read') then status
          else 'sent'
        end,
        sent_at = coalesce(sent_at, v_event),
        delivery_status_updated_at = v_now,
        updated_at = v_now
    where id = v_row.id;
  elsif p_status = 'delivered' then
    update public.whatsapp_outbound_messages
    set status = case
          when status = 'read' then 'read'
          else 'delivered'
        end,
        sent_at = coalesce(sent_at, v_event),
        delivered_at = coalesce(delivered_at, v_event),
        delivery_status_updated_at = v_now,
        updated_at = v_now
    where id = v_row.id;
  elsif p_status = 'read' then
    update public.whatsapp_outbound_messages
    set status = 'read',
        sent_at = coalesce(sent_at, v_event),
        delivered_at = coalesce(delivered_at, v_event),
        read_at = coalesce(read_at, v_event),
        delivery_status_updated_at = v_now,
        updated_at = v_now
    where id = v_row.id;
  elsif p_status = 'failed' then
    if v_row.status in ('sent', 'delivered', 'delivery_unknown', 'sending', 'pending', 'retry') then
      update public.whatsapp_outbound_messages
      set status = 'failed',
          failed_at = coalesce(failed_at, v_event),
          provider_error_code = left(coalesce(p_provider_error_code, ''), 64),
          error_code = coalesce(error_code, 'meta_delivery_failed'),
          delivery_status_updated_at = v_now,
          updated_at = v_now
      where id = v_row.id;
    else
      return jsonb_build_object('applied', false, 'reason', 'no_regress');
    end if;
  end if;

  return jsonb_build_object('applied', true, 'status', p_status);
end;
$$;

revoke all on function public.whatsapp_apply_delivery_status(text, text, timestamptz, text) from public;
revoke all on function public.whatsapp_apply_delivery_status(text, text, timestamptz, text) from anon;
revoke all on function public.whatsapp_apply_delivery_status(text, text, timestamptz, text) from authenticated;
grant execute on function public.whatsapp_apply_delivery_status(text, text, timestamptz, text) to service_role;
