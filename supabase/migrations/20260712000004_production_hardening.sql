-- =============================================================================
-- 20260712000004_production_hardening.sql
-- Incremental hardening for production. DO NOT apply in this iteration.
-- Does not recreate tables or delete data. Idempotent where reasonable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) USAGE EVENTS — remove authenticated insert; unique (user_id, request_id)
-- -----------------------------------------------------------------------------
-- Users could previously insert their own usage_events (including forged costs).
-- After this migration, only the service role / trusted backend may insert.

drop policy if exists "usage_events_insert_own" on public.usage_events;

-- Keep select own
-- (policy usage_events_select_own already exists from foundation)

create unique index if not exists usage_events_user_request_id_uidx
  on public.usage_events (user_id, request_id);

comment on index public.usage_events_user_request_id_uidx is
  'Prevents double-counting the same request_id per user.';

-- -----------------------------------------------------------------------------
-- 2) MESSAGES — authenticated inserts only for role = user; ownership check
-- -----------------------------------------------------------------------------
drop policy if exists "messages_insert_own" on public.messages;

-- Authenticated users may insert only their own user-role messages into
-- conversations they own. Assistant/system rows require service role.
create policy "messages_insert_own_user_role"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and role = 'user'
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

comment on policy "messages_insert_own_user_role" on public.messages is
  'Users may insert only role=user into their own conversations. Assistant/system via service role.';

-- Helpful uniqueness for idempotent retries (nullable request_id allowed multiple nulls in PG)
create unique index if not exists messages_user_request_role_uidx
  on public.messages (user_id, request_id, role)
  where request_id is not null;

-- -----------------------------------------------------------------------------
-- 3) CONVERSATION SUMMARIES — remove authenticated write
-- -----------------------------------------------------------------------------
drop policy if exists "conversation_summaries_insert_own"
  on public.conversation_summaries;

drop policy if exists "conversation_summaries_update_own"
  on public.conversation_summaries;

-- Select own remains from foundation.
comment on table public.conversation_summaries is
  'Summaries are written only by trusted backend (service role). Users may select own rows.';

-- -----------------------------------------------------------------------------
-- 4) SECURITY DEFINER — harden handle_new_user + compute_daily_report_aggregates
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      pg_catalog.split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
-- Trigger runs as owner; no EXECUTE needed for end users.

create or replace function public.compute_daily_report_aggregates(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  -- Direct auth check (do not call public.is_admin() from SECURITY DEFINER).
  if auth.role() = 'service_role'
     or exists (
       select 1
       from public.admin_roles ar
       where ar.user_id = auth.uid()
         and ar.role in ('admin', 'ops', 'finance')
     )
  then
    null; -- allowed
  else
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'date', p_date,
    'activeSubscribers', (
      select count(*) from public.subscriptions
      where status in ('active', 'trialing')
    ),
    -- Real revenue will be added after the payments ledger is integrated.
    'revenueBrlCents', null,
    'activeUsers', (
      select count(distinct user_id) from public.usage_events
      where created_at::date = p_date
    ),
    'totalRequests', (
      select count(*) from public.usage_events
      where created_at::date = p_date
    ),
    'totalInputTokens', (
      select coalesce(sum(input_tokens), 0) from public.usage_events
      where created_at::date = p_date
    ),
    'totalOutputTokens', (
      select coalesce(sum(output_tokens), 0) from public.usage_events
      where created_at::date = p_date
    ),
    'aiCostUsdMicros', (
      select coalesce(sum(estimated_cost_usd_micros), 0) from public.usage_events
      where created_at::date = p_date
    ),
    'aiCostBrlCents', (
      select coalesce(sum(estimated_cost_brl_cents), 0) from public.usage_events
      where created_at::date = p_date
    ),
    'errorCount', (
      select count(*) from public.usage_events
      where created_at::date = p_date and success = false
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.compute_daily_report_aggregates(date) from public;
revoke all on function public.compute_daily_report_aggregates(date) from anon;
-- Authenticated callers are gated inside via admin_roles; service_role always can.
grant execute on function public.compute_daily_report_aggregates(date) to authenticated;
grant execute on function public.compute_daily_report_aggregates(date) to service_role;

-- Harden is_admin as well
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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- -----------------------------------------------------------------------------
-- 5) INTEGRITY — Stripe subscription id uniqueness; customer id is non-unique
-- -----------------------------------------------------------------------------
-- One Stripe subscription maps to at most one local row.
create unique index if not exists subscriptions_stripe_subscription_id_uidx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- A customer may have multiple subscriptions over time — index only, not unique.
create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

comment on table public.usage_events is
  'Append-only usage ledger. Inserts only via trusted backend after migration 004.';
