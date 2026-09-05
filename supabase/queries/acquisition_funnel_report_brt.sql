-- =============================================================================
-- Acquisition funnel report (America/Sao_Paulo)
-- Run with service role / dashboard (not anon).
-- Edit the two dates in `bounds` for the BRT window [start, end).
--
-- Metrics:
--   event_count      = rows after event_id dedupe at write
--   unique_sessions  = distinct session_key (tab sessionStorage — NOT a person;
--                      new tab / other browser = new session)
--
-- /comece stages: use ONLY paid_landing_* (+ signup_started). Do not sum
-- generic landing_viewed / plans_cta_clicked with paid_landing_* for the same step.
-- =============================================================================

with bounds as (
  select
    ('2026-09-05'::date::timestamp at time zone 'America/Sao_Paulo') as start_at,
    ('2026-09-06'::date::timestamp at time zone 'America/Sao_Paulo') as end_at
),
qa as (
  select
    e.*,
    (
      lower(coalesce(e.utm_source, '')) in ('qa', 'amem-qa', 'amem_qa')
      or lower(coalesce(e.utm_campaign, '')) in (
        'launch_readiness', 'capi_final', 'audit_final', 'qa', 'amem_qa'
      )
      or lower(coalesce(e.utm_content, '')) in (
        'audit_final', 'capi_final', 'qa', 'probe'
      )
      or lower(coalesce(e.utm_campaign, '')) like 'qa[_]%'
      or lower(coalesce(e.utm_campaign, '')) like 'qa-%'
      or lower(coalesce(e.utm_campaign, '')) like '%launch_readiness%'
      or lower(coalesce(e.utm_content, '')) like 'qa[_]%'
      or lower(coalesce(e.utm_content, '')) like 'audit[_]%'
      or lower(coalesce(e.utm_content, '')) like 'capi[_]%'
    ) as is_synthetic_qa
  from public.public_conversion_events e
  cross join bounds b
  where e.received_at >= b.start_at
    and e.received_at < b.end_at
)
select
  coalesce(utm_campaign, '(none)') as utm_campaign,
  coalesce(utm_content, '(none)') as utm_content,
  is_synthetic_qa,
  event_name,
  count(*)::bigint as event_count,
  count(distinct session_key)::bigint as unique_sessions
from qa
where is_synthetic_qa = false
group by 1, 2, 3, 4
order by
  utm_campaign,
  utm_content,
  event_name;
