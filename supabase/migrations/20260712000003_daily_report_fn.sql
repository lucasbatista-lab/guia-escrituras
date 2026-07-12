-- Aggregate helpers for daily reports (no PII / message content).
-- Apply with schema migration; do not run remotely in this execution.

create or replace function public.compute_daily_report_aggregates(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- Only callable by admins or service role in practice; gated below.
  if not (public.is_admin() or current_setting('role', true) = 'service_role') then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'date', p_date,
    'activeSubscribers', (
      select count(*) from public.subscriptions
      where status in ('active', 'trialing')
    ),
    'revenueBrlCents', 0,
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
