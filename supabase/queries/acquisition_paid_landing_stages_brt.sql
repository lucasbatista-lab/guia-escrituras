-- Paid landing (/comece) stage counts — do not mix with organic landing_* events.
-- Same BRT bounds pattern as acquisition_funnel_report_brt.sql.

with bounds as (
  select
    ('2026-09-05'::date::timestamp at time zone 'America/Sao_Paulo') as start_at,
    ('2026-09-06'::date::timestamp at time zone 'America/Sao_Paulo') as end_at
),
paid as (
  select *
  from public.public_conversion_events e
  cross join bounds b
  where e.received_at >= b.start_at
    and e.received_at < b.end_at
    and (
      e.event_name like 'paid_landing_%'
      or e.event_name = 'signup_started'
    )
    and not (
      lower(coalesce(e.utm_source, '')) in ('qa', 'amem-qa', 'amem_qa')
      or lower(coalesce(e.utm_campaign, '')) like 'qa[_]%'
      or lower(coalesce(e.utm_campaign, '')) like '%launch_readiness%'
      or lower(coalesce(e.utm_content, '')) like 'qa[_]%'
      or lower(coalesce(e.utm_content, '')) like 'audit[_]%'
      or lower(coalesce(e.utm_content, '')) like 'capi[_]%'
    )
)
select
  coalesce(utm_campaign, '(none)') as utm_campaign,
  coalesce(utm_content, '(none)') as utm_content,
  count(*) filter (where event_name = 'paid_landing_viewed') as viewed_events,
  count(distinct session_key) filter (where event_name = 'paid_landing_viewed') as viewed_sessions,
  count(*) filter (where event_name = 'paid_landing_primary_cta_clicked') as primary_cta_events,
  count(distinct session_key) filter (where event_name = 'paid_landing_primary_cta_clicked') as primary_cta_sessions,
  count(*) filter (where event_name = 'paid_landing_plan_selected') as plan_selected_events,
  count(distinct session_key) filter (where event_name = 'paid_landing_plan_selected') as plan_selected_sessions,
  count(*) filter (where event_name = 'signup_started') as signup_started_events,
  count(distinct session_key) filter (where event_name = 'signup_started') as signup_started_sessions
from paid
group by 1, 2
order by 1, 2;
