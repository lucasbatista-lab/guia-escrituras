# Owner Data Portability (V1)

Self-service export of the authenticated user's own Amém Chat data.

## Scope

- **Read-only.** Does not delete the account or mutate stored data.
- Available to any authenticated user from `/conta` → “Baixar meus dados”.
- Admins receive no special treatment: they export only their own account.

## Route

`GET /api/account/export`

- Anonymous → `401` JSON
- Session `userId` only — client-supplied `userId` query/body/header is ignored
- Non-GET → `405` with `Allow: GET`
- Response: pretty-printed UTF-8 JSON attachment

Filename: `amem-chat-meus-dados-YYYY-MM-DD.json` (UTC date, never includes email)

Headers:

- `Content-Type: application/json; charset=utf-8`
- `Content-Disposition: attachment; filename="…"`
- `Cache-Control: private, no-store`
- `X-Content-Type-Options: nosniff`
- `X-Robots-Tag: noindex, nofollow`

## Format version

`exportVersion`: `amem-chat-user-data-v1`

Top-level keys: `generatedAt`, `account`, `spiritualProfile`, `legalConsents`, `acquisition`, `subscription`, `conversations`, `usageSummary`, `referrals`, `notes`.

Dates are ISO 8601. Monetary values use explicit cent fields (e.g. `priceMonthlyCents`, `estimatedCostBrlCents`). Missing optionals are `null`; empty collections are `[]`.

## Included

| Area | Source |
|------|--------|
| Account | `profiles` + session email + onboarding flag |
| Spiritual profile | `spiritual_profiles` |
| Legal consents | `legal_consents` |
| Acquisition / UTM | linked `signup_intents` (no `token_hash`, no checkout session id) |
| Subscription | local `subscriptions` + plan catalog labels; provider ids **masked** |
| Conversations / messages | own rows only; roles `user`/`assistant`; chronological |
| Usage summary | totals, last 30 days, monthly rows; cost fields labeled as estimates |
| Referrals | own code; attribution as referred; referrer reward statuses (no third-party emails) |

## Excluded

- Stripe secrets, webhook payloads, payment methods, card numbers
- `signup_intents.token_hash`, `stripe_checkout_session_id`
- System prompts, internal AI traces, tokens, request headers
- `payment_events`, `admin_roles`, other users’ messages/PII
- Raw usage event dumps (model/token/latency rows)
- Live `cancel_at_period_end` (not persisted locally; shown live on `/conta` via Stripe)

## Authorization

1. Resolve session with `getAuthUserContext()` / cookie SSR Supabase `getUser()`.
2. Pass **only** `auth.userId` and `auth.email` into `buildUserDataExport`.
3. Repository/admin queries always filter by that `userId`.
4. Ownership checks reject any row that does not match the session user.

Service role is used only where RLS has no user policy (`signup_intents`, legal consent writes historically) and always with an explicit `user_id` filter.

## High volume

Strategy: server-side pagination (page size 500, max 200 pages per collection) assembling a single JSON document.

If a collection would exceed the page cap, the API returns an **explicit** `413` / `export_too_large` error — never a silently truncated success file.

## How to test

```bash
pnpm exec vitest run tests/account-data-export.test.ts
pnpm test
pnpm lint
pnpm build
```

Manual (local, no external services): sign in with demo/mocks if enabled, open `/conta`, click “Baixar meus dados”, open the JSON, confirm `exportVersion` and absence of secrets.

## Limitations

- `cancelAtPeriodEnd` is always `null` in the file (not in DB).
- First/last-touch cookies are not re-exported; only UTMs persisted on signup intents.
- Estimated costs are operational estimates, not invoices.
- Very large histories may hit the page cap and require support-assisted export.
- This is **not** account deletion.
- Journey progress (`journey_progress`) has a prepared export mapper in
  `src/lib/journeys/progress/export-mapper.ts` but is **not** included in
  `amem-chat-user-data-v1` until the migration is applied and export is
  intentionally wired (`docs/READING_JOURNEYS_PERSISTENCE.md`).

## Export vs delete

| Export | Delete |
|--------|--------|
| Download a copy | Remove account / data |
| Available in V1 via `/conta` | Not automated yet — support channel |

## Next steps (account deletion)

Would require a separate product/legal design: soft-delete vs hard-delete, billing retention, Stripe customer lifecycle, and likely migrations for deletion audit trails. Do not conflate with this export.
