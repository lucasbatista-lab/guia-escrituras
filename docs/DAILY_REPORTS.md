# Daily reporting & launch cron

## Timezone and schedule

- All daily report dates are **UTC calendar days**.
- Vercel Cron (`vercel.json`): `15 0 * * *` → **00:15 UTC**.
- The job processes **yesterday’s complete UTC day** (not the partial current day).
- No dependency on the instance’s local timezone.

## Environment

Set on Vercel (Production) — **presence only; not yet assumed validated in production**:

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Shared secret; Vercel sends `Authorization: Bearer <CRON_SECRET>` |
| `SUPABASE_SECRET_KEY` | Service role for RPC + upsert into `daily_reports` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Canonical host (already required) |

Do **not** commit secret values. `.env.example` lists only the name `CRON_SECRET=`.

Implemented and tested locally: cron route, admin generate/backfill, overview alerts.  
Still depends on remote `CRON_SECRET` + Vercel Cron invocation after deploy.

No additional database migration is required for this block. It reuses:

- `compute_daily_report_aggregates(p_date)`
- table `daily_reports` (`report_date` UNIQUE → idempotent upsert)

## Routes

| Route | Auth | Role |
|-------|------|------|
| `GET/POST /api/cron/daily-report` | `CRON_SECRET` (Bearer or `x-cron-secret`) | Automated cron |
| `POST /api/admin/reports/generate` | Admin session (`requireAdminUser`) | Manual day / backfill ≤ 31 days |
| `GET /api/reports/daily` | Admin session | Read latest stored report |

Optional cron query: `?date=YYYY-MM-DD` (must be a **past** complete UTC day).

## Local test (without production)

```bash
# With CRON_SECRET set in .env.local
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/daily-report?date=2026-07-17"
```

Expect JSON like `{ "ok": true, "date": "...", "outcome": "created"|"updated"|"unchanged" }` — never the secret or a stack trace.

Missing/invalid secret → `401`. Unconfigured secret → `503 cron_not_configured`.

## Admin UI

`/admin/relatorios`:

- Lists stored reports (enriched aggregates + rule-based interpretation).
- Generate one UTC day (optional force recalculate with confirm).
- Short backfill (`from`/`to`, max 31 days) requires explicit `confirm` + UI confirmation.
- No delete operations.

## Diagnosing a late/missing report

1. Overview alert: “Relatório diário UTC … ainda não foi gerado”.
2. Vercel → Cron → invocations of `/api/cron/daily-report`.
3. Confirm `CRON_SECRET` is set in the Production environment.
4. Confirm `SUPABASE_SECRET_KEY` can call the RPC and upsert.
5. Manually generate yesterday from `/admin/relatorios`.

## Metric honesty / limitations

| Metric | Nature |
|--------|--------|
| `revenueBrlCents` | Always **null** until Stripe cash ledger exists |
| `catalogMrrBrlCents` | Catalog price × active subscribers (**estimate**, not cash) |
| `activeSubscribers` | Snapshot at generation time |
| Chat HTTP 409/429/503 | **Logs only** — not in `usage_events` / daily report |
| `errorCount` | Rows with `usage_events.success = false` (rarely written by chat today) |
| Retention D1/D7/D30 | Not computed (no event ledger) — stored as 0 |

Do not treat planning AI cost as the OpenAI invoice.
