-- Coverage between first-party beacons and signup_intents (UTM overlap ≠ join).
-- Shared UTM is NOT proof that a visit became a purchase.
-- Join is by sanitized campaign+content+day BRT only — approximate coverage.

with bounds as (
  select
    ('2026-09-05'::date::timestamp at time zone 'America/Sao_Paulo') as start_at,
    ('2026-09-06'::date::timestamp at time zone 'America/Sao_Paulo') as end_at
),
beacon_campaigns as (
  select
    coalesce(utm_campaign, '(none)') as utm_campaign,
    coalesce(utm_content, '(none)') as utm_content,
    count(*) filter (where event_name = 'paid_landing_viewed') as viewed_events,
    count(distinct session_key) filter (where event_name = 'paid_landing_viewed') as viewed_sessions,
    count(*) filter (where event_name = 'signup_started') as signup_started_events
  from public.public_conversion_events e
  cross join bounds b
  where e.received_at >= b.start_at
    and e.received_at < b.end_at
  group by 1, 2
),
intent_campaigns as (
  select
    coalesce(utm_campaign, '(none)') as utm_campaign,
    coalesce(utm_content, '(none)') as utm_content,
    count(*)::bigint as intent_rows,
    count(*) filter (where status = 'checkout_created') as checkout_created,
    count(*) filter (where status = 'completed') as completed
  from public.signup_intents si
  cross join bounds b
  where si.created_at >= b.start_at
    and si.created_at < b.end_at
  group by 1, 2
)
select
  coalesce(b.utm_campaign, i.utm_campaign) as utm_campaign,
  coalesce(b.utm_content, i.utm_content) as utm_content,
  coalesce(b.viewed_events, 0) as beacon_viewed_events,
  coalesce(b.viewed_sessions, 0) as beacon_viewed_sessions,
  coalesce(b.signup_started_events, 0) as beacon_signup_started,
  coalesce(i.intent_rows, 0) as signup_intent_rows,
  coalesce(i.checkout_created, 0) as signup_intent_checkout_created,
  coalesce(i.completed, 0) as signup_intent_completed,
  case
    when coalesce(b.viewed_events, 0) = 0 and coalesce(i.intent_rows, 0) = 0 then 'empty'
    when coalesce(b.signup_started_events, 0) > 0 and coalesce(i.intent_rows, 0) = 0
      then 'beacon_without_intent'
    when coalesce(b.signup_started_events, 0) = 0 and coalesce(i.intent_rows, 0) > 0
      then 'intent_without_beacon'
    else 'both_present_utm_overlap_only'
  end as coverage_note
from beacon_campaigns b
full outer join intent_campaigns i
  on b.utm_campaign = i.utm_campaign
 and b.utm_content = i.utm_content
order by 1, 2;
