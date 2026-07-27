-- =============================================================================
-- Transactional RUNTIME SMOKE for MIG 012 — complete RPC executable proof
-- Run AFTER structural postcheck. Uses BEGIN/ROLLBACK — no persisted data.
-- Does not print UUID or e-mail. Returns one row of booleans + overall_ok.
-- Requires: at least one row in public.profiles (existing user).
-- =============================================================================

begin;

do $$
declare
  smoke_user uuid;
  smoke_slug text := 'mig012-runtime-smoke-' || replace(gen_random_uuid()::text, '-', '');
  total text[] := array['s1', 's2', 's3'];
  row_after_start public.journey_progress;
  row_mid public.journey_progress;
  row_final public.journey_progress;
  row_reset public.journey_progress;
  mid_ok boolean := false;
  final_ok boolean := false;
  reset_ok boolean := false;
  start_ok boolean := false;
  idempotent_ok boolean := false;
  row_idem public.journey_progress;
begin
  select id
  into smoke_user
  from public.profiles
  order by created_at nulls last, id
  limit 1;

  if smoke_user is null then
    raise exception 'runtime smoke requires an existing profiles row';
  end if;

  row_after_start := public.start_journey_progress(smoke_user, smoke_slug, 's1');
  start_ok :=
    row_after_start.user_id = smoke_user
    and row_after_start.journey_slug = smoke_slug
    and coalesce(cardinality(row_after_start.completed_step_ids), 0) = 0
    and row_after_start.completed_at is null;

  row_mid := public.complete_journey_progress_step(
    smoke_user,
    smoke_slug,
    's2',
    's3',
    total
  );
  mid_ok :=
    's2' = any (row_mid.completed_step_ids)
    and cardinality(row_mid.completed_step_ids) = 1
    and row_mid.completed_at is null
    and row_mid.current_step_id is not distinct from 's3';

  -- Idempotency: completing the same step again must not duplicate
  row_idem := public.complete_journey_progress_step(
    smoke_user,
    smoke_slug,
    's2',
    's3',
    total
  );
  idempotent_ok :=
    cardinality(row_idem.completed_step_ids) = 1
    and row_idem.completed_at is null;

  -- Finish remaining steps
  perform public.complete_journey_progress_step(
    smoke_user, smoke_slug, 's1', 's2', total
  );
  row_final := public.complete_journey_progress_step(
    smoke_user, smoke_slug, 's3', null, total
  );
  final_ok :=
    cardinality(row_final.completed_step_ids) = 3
    and row_final.completed_at is not null
    and row_final.current_step_id is null
    and total <@ row_final.completed_step_ids;

  row_reset := public.reset_journey_progress(smoke_user, smoke_slug);
  reset_ok :=
    coalesce(cardinality(row_reset.completed_step_ids), 0) = 0
    and row_reset.completed_at is null
    and row_reset.current_step_id is null;

  create temporary table if not exists _mig012_smoke_result (
    start_ok boolean,
    mid_step_ok boolean,
    idempotent_ok boolean,
    final_complete_ok boolean,
    reset_ok boolean
  ) on commit drop;

  delete from _mig012_smoke_result;
  insert into _mig012_smoke_result values (
    start_ok, mid_ok, idempotent_ok, final_ok, reset_ok
  );
end;
$$;

select
  start_ok,
  mid_step_ok,
  idempotent_ok,
  final_complete_ok,
  reset_ok,
  (
    start_ok
    and mid_step_ok
    and idempotent_ok
    and final_complete_ok
    and reset_ok
  ) as overall_ok
from _mig012_smoke_result;

rollback;
