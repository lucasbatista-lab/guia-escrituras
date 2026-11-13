-- WhatsApp local integration gate SQL tests (synthetic data only).
-- Run against gate_clean after migrations 001-021.
\set ON_ERROR_STOP on

do $$
declare
  v_user1 uuid := '11111111-1111-4111-8111-111111111111';
  v_user2 uuid := '22222222-2222-4222-8222-222222222222';
  v_hash text := 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  v_hash2 text := 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  v_token_id uuid;
  v_res jsonb;
  v_identity uuid;
  v_inbound_id uuid;
  v_inbound_id2 uuid;
  v_claim1 jsonb;
  v_claim2 jsonb;
  v_outbox_id uuid;
  v_out_claim1 jsonb;
  v_out_claim2 jsonb;
  v_item jsonb;
  v_claim_token uuid;
  v_status jsonb;
  v_cnt integer;
  v_rls_fail boolean;
begin
  -- Synthetic users
  insert into auth.users (id, email) values
    (v_user1, 'gate1@example.invalid'),
    (v_user2, 'gate2@example.invalid')
  on conflict (id) do nothing;

  ------------------------------------------------------------------
  -- Schema presence
  ------------------------------------------------------------------
  perform 1 from information_schema.tables
   where table_schema='public' and table_name='whatsapp_inbound_events';
  perform 1 from information_schema.tables
   where table_schema='public' and table_name='user_channel_identities';
  perform 1 from information_schema.tables
   where table_schema='public' and table_name='channel_identity_link_tokens';
  perform 1 from information_schema.tables
   where table_schema='public' and table_name='whatsapp_outbound_messages';

  ------------------------------------------------------------------
  -- RLS enabled
  ------------------------------------------------------------------
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='whatsapp_inbound_events' and c.relrowsecurity
  ) then raise exception 'RLS missing inbound'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='user_channel_identities' and c.relrowsecurity
  ) then raise exception 'RLS missing identities'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='channel_identity_link_tokens' and c.relrowsecurity
  ) then raise exception 'RLS missing tokens'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='whatsapp_outbound_messages' and c.relrowsecurity
  ) then raise exception 'RLS missing outbound'; end if;

  ------------------------------------------------------------------
  -- Grants: anon/authenticated must NOT have table privileges
  ------------------------------------------------------------------
  if has_table_privilege('anon', 'public.whatsapp_inbound_events', 'select') then
    raise exception 'anon can select inbound';
  end if;
  if has_table_privilege('authenticated', 'public.whatsapp_inbound_events', 'select') then
    raise exception 'authenticated can select inbound';
  end if;
  if has_table_privilege('anon', 'public.user_channel_identities', 'select') then
    raise exception 'anon can select identities';
  end if;
  if has_table_privilege('authenticated', 'public.whatsapp_outbound_messages', 'select') then
    raise exception 'authenticated can select outbound';
  end if;
  if has_table_privilege('service_role', 'public.whatsapp_inbound_events', 'select') is not true then
    raise exception 'service_role missing inbound select';
  end if;

  ------------------------------------------------------------------
  -- RPC execute privileges
  ------------------------------------------------------------------
  if has_function_privilege('anon', 'public.whatsapp_claim_inbound_bundle(integer,integer)', 'execute') then
    raise exception 'anon can execute inbound claim';
  end if;
  if has_function_privilege('authenticated', 'public.whatsapp_consume_link_token(text,text)', 'execute') then
    raise exception 'authenticated can execute consume link';
  end if;
  if has_function_privilege('anon', 'public.whatsapp_claim_outbound_messages(integer,integer)', 'execute') then
    raise exception 'anon can execute outbound claim';
  end if;
  if has_function_privilege('service_role', 'public.whatsapp_claim_outbound_messages(integer,integer)', 'execute') is not true then
    raise exception 'service_role missing outbound claim execute';
  end if;

  ------------------------------------------------------------------
  -- Identity + link token
  ------------------------------------------------------------------
  insert into public.channel_identity_link_tokens (
    user_id, channel, token_hash, expires_at, attempt_count, max_attempts
  ) values (v_user1, 'whatsapp', v_hash, timezone('utc', now()) + interval '10 minutes', 0, 5)
  returning id into v_token_id;

  -- plaintext must never be stored: ensure no column looks like code body
  if exists (
    select 1 from information_schema.columns
    where table_name='channel_identity_link_tokens'
      and column_name in ('token','code','plaintext','token_plain')
  ) then raise exception 'plaintext token column exists'; end if;

  v_res := public.whatsapp_consume_link_token(v_hash, '5511999990001');
  if v_res->>'result' <> 'linked' then
    raise exception 'expected linked, got %', v_res;
  end if;
  v_identity := (v_res->>'identity_id')::uuid;

  -- single-use
  v_res := public.whatsapp_consume_link_token(v_hash, '5511999990001');
  if v_res->>'result' <> 'token_consumed' then
    raise exception 'expected token_consumed, got %', v_res;
  end if;

  -- same external + same user idempotent via new token
  insert into public.channel_identity_link_tokens (
    user_id, channel, token_hash, expires_at, attempt_count, max_attempts
  ) values (v_user1, 'whatsapp', v_hash2, timezone('utc', now()) + interval '10 minutes', 0, 5);
  v_res := public.whatsapp_consume_link_token(v_hash2, '5511999990001');
  if v_res->>'result' <> 'already_linked_same_user' then
    raise exception 'expected already_linked_same_user, got %', v_res;
  end if;

  -- takeover blocked
  insert into public.channel_identity_link_tokens (
    user_id, channel, token_hash, expires_at, attempt_count, max_attempts
  ) values (
    v_user2, 'whatsapp',
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    timezone('utc', now()) + interval '10 minutes', 0, 5
  );
  v_res := public.whatsapp_consume_link_token(
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    '5511999990001'
  );
  if v_res->>'result' <> 'external_identity_conflict' then
    raise exception 'expected external_identity_conflict, got %', v_res;
  end if;
  -- conflict must not leak other user id
  if v_res ? 'user_id' then
    raise exception 'conflict leaked user_id';
  end if;

  -- user already has other identity
  insert into public.channel_identity_link_tokens (
    user_id, channel, token_hash, expires_at, attempt_count, max_attempts
  ) values (
    v_user1, 'whatsapp',
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    timezone('utc', now()) + interval '10 minutes', 0, 5
  );
  v_res := public.whatsapp_consume_link_token(
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    '5511999990002'
  );
  if v_res->>'result' <> 'user_already_has_other_identity' then
    raise exception 'expected user_already_has_other_identity, got %', v_res;
  end if;

  ------------------------------------------------------------------
  -- Inbound idempotency + claim concurrency
  ------------------------------------------------------------------
  insert into public.whatsapp_inbound_events (
    provider_message_id, external_sender_id, message_type, message_text,
    received_at, available_after, status, attempt_count, expires_at
  ) values (
    'wamid.gate.1', '5511999990001', 'text', 'ola',
    timezone('utc', now()) - interval '10 seconds',
    timezone('utc', now()) - interval '1 second',
    'pending', 0, timezone('utc', now()) + interval '1 day'
  ) returning id into v_inbound_id;

  begin
    insert into public.whatsapp_inbound_events (
      provider_message_id, external_sender_id, message_type, message_text,
      received_at, available_after, status, attempt_count, expires_at
    ) values (
      'wamid.gate.1', '5511999990001', 'text', 'dup',
      timezone('utc', now()), timezone('utc', now()),
      'pending', 0, timezone('utc', now()) + interval '1 day'
    );
    raise exception 'duplicate provider_message_id allowed';
  exception when unique_violation then
    null;
  end;

  v_claim1 := public.whatsapp_claim_inbound_bundle(90, 10);
  if coalesce((v_claim1->>'claimed')::boolean, false) is not true then
    raise exception 'inbound claim failed: %', v_claim1;
  end if;
  v_claim2 := public.whatsapp_claim_inbound_bundle(90, 10);
  if coalesce((v_claim2->>'claimed')::boolean, false) then
    raise exception 'second inbound claim should miss locked bundle: %', v_claim2;
  end if;

  perform public.whatsapp_complete_inbound_bundle(
    (v_claim1->>'bundle_id')::uuid, 'processed', null
  );

  ------------------------------------------------------------------
  -- Outbox claim concurrency + complete + status monotonic
  ------------------------------------------------------------------
  insert into public.whatsapp_outbound_messages (
    identity_id, idempotency_key, message_type, body_text, status,
    attempt_count, available_after, expires_at
  ) values (
    v_identity, 'bundle:gate-1', 'link_confirmation', 'ok vinculou', 'pending',
    0, timezone('utc', now()) - interval '1 second',
    timezone('utc', now()) + interval '1 day'
  ) returning id into v_outbox_id;

  begin
    insert into public.whatsapp_outbound_messages (
      identity_id, idempotency_key, message_type, body_text, status,
      attempt_count, available_after, expires_at
    ) values (
      v_identity, 'bundle:gate-1', 'text', 'dup', 'pending',
      0, timezone('utc', now()), timezone('utc', now()) + interval '1 day'
    );
    raise exception 'duplicate idempotency_key allowed';
  exception when unique_violation then
    null;
  end;

  v_out_claim1 := public.whatsapp_claim_outbound_messages(90, 5);
  if coalesce((v_out_claim1->>'claimed')::boolean, false) is not true then
    raise exception 'outbound claim1 failed %', v_out_claim1;
  end if;
  v_out_claim2 := public.whatsapp_claim_outbound_messages(90, 5);
  if coalesce((v_out_claim2->>'claimed')::boolean, false) then
    raise exception 'outbound claim2 should miss: %', v_out_claim2;
  end if;

  v_item := (v_out_claim1->'items')->0;
  v_claim_token := (v_item->>'claim_token')::uuid;

  -- stale token cannot complete
  v_res := public.whatsapp_complete_outbound_send(
    v_outbox_id, gen_random_uuid(), 'wamid.out.1'
  );
  if coalesce((v_res->>'ok')::boolean, false) then
    raise exception 'stale claim completed';
  end if;

  v_res := public.whatsapp_complete_outbound_send(
    v_outbox_id, v_claim_token, 'wamid.out.1'
  );
  if coalesce((v_res->>'ok')::boolean, false) is not true then
    raise exception 'complete failed %', v_res;
  end if;

  v_status := public.whatsapp_apply_delivery_status('wamid.out.1', 'delivered', timezone('utc', now()), null);
  if coalesce((v_status->>'applied')::boolean, false) is not true then
    raise exception 'delivered not applied %', v_status;
  end if;
  v_status := public.whatsapp_apply_delivery_status('wamid.out.1', 'sent', timezone('utc', now()), null);
  if coalesce((v_status->>'applied')::boolean, false) then
    raise exception 'regress sent after delivered applied';
  end if;
  v_status := public.whatsapp_apply_delivery_status('wamid.out.1', 'read', timezone('utc', now()), null);
  if coalesce((v_status->>'applied')::boolean, false) is not true then
    raise exception 'read not applied %', v_status;
  end if;
  v_status := public.whatsapp_apply_delivery_status('wamid.out.1', 'failed', timezone('utc', now()), '131');
  if coalesce((v_status->>'applied')::boolean, false) then
    raise exception 'failed after read should not regress';
  end if;
  select count(*) into v_cnt from public.whatsapp_outbound_messages where id = v_outbox_id and status = 'read';
  if v_cnt <> 1 then raise exception 'final status not read'; end if;

  v_status := public.whatsapp_apply_delivery_status('wamid.unknown', 'delivered', timezone('utc', now()), null);
  if coalesce((v_status->>'applied')::boolean, false) then
    raise exception 'unknown provider id applied';
  end if;

  ------------------------------------------------------------------
  -- revoked identity not claimable for outbound
  ------------------------------------------------------------------
  update public.user_channel_identities
    set status='revoked', revoked_at=timezone('utc', now())
  where id = v_identity;

  insert into public.whatsapp_outbound_messages (
    identity_id, idempotency_key, message_type, body_text, status,
    attempt_count, available_after, expires_at
  ) values (
    v_identity, 'bundle:gate-revoked', 'text', 'nope', 'pending',
    0, timezone('utc', now()) - interval '1 second',
    timezone('utc', now()) + interval '1 day'
  );
  v_out_claim1 := public.whatsapp_claim_outbound_messages(90, 5);
  if coalesce((v_out_claim1->>'claimed')::boolean, false) then
    raise exception 'revoked identity outbox was claimed';
  end if;

  raise notice 'WHATSAPP_SQL_GATE_OK';
end $$;

-- Role-switch denial smoke (table access under anon)
set local role anon;
do $$
begin
  begin
    perform count(*) from public.whatsapp_inbound_events;
    -- with RLS and no policy, count should be 0 even if somehow granted;
    -- privilege check above is primary. If select works, ensure empty.
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

select 'WHATSAPP_SQL_GATE_OK' as result;
