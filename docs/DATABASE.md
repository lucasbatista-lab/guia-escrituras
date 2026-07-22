# Database — Amém Chat

Migrations em `supabase/migrations/`.

## Estado remoto (documentado — atualizar após B00 humano)

| Migration | Conteúdo | Estado documentado |
|-----------|----------|-------------------|
| `001` foundation | schema + RLS base | **Aplicada** (cutover) |
| `002` seed | catálogo planos/entitlements | **Aplicada** |
| `003` daily report fn | agregados | **Aplicada** |
| `004` production hardening | RLS endurecido + uniques | **Não aplicada** (decisão cutover; aplicar só com revisão — pacote `docs/_ai/AMEM_MIG004_DECISION_AND_VALIDATION_PACK_2026-07-22.md`) |
| `005` signup_intents | intents de cadastro/checkout | **Provável em produção** (código de billing/cadastro depende); **confirmar no B00** |
| `006` stripe billing | `billing_customers`, `payment_events` | **Provável em produção** (webhook depende); **confirmar no B00** |
| `007` legal_consents | consentimentos | **Provável em produção** (cadastro legal depende); **confirmar no B00** |
| `008` journey_progress | progresso de Jornadas + RPCs | **Aplicada** em produção (humano, 2026-07-20 — `END_OF_DAY_MASTER_REPORT`, `NEXT_STEPS`) |

**Não** reaplicar migrations. **Não** executar rollback. Postchecks são **somente leitura**.

Postcheck Jornadas (preferencial):
`supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql`

## Arquivos

1. `20260712000001_foundation_schema.sql` — schema + RLS (não alterar)
2. `20260712000002_seed_catalog.sql` — catálogo (não alterar)
3. `20260712000003_daily_report_fn.sql` — agregados (não alterar)
4. `20260712000004_production_hardening.sql` — hardening (aplicar manualmente depois, com aprovação)
5. `20260712000005_signup_intents.sql` — intents
6. `20260712000006_stripe_billing.sql` — customers + payment_events
7. `20260712000007_legal_consents.sql` — consentimentos
8. `20260712000008_journey_progress.sql` — progresso de Jornadas (aplicada; não reaplicar)

## Migration 004 (resumo — ainda não aplicada)

- Remove insert autenticado em `usage_events`; unique `(user_id, request_id)`
- Messages: authenticated só `role=user` + ownership da conversation
- Summaries: sem insert/update autenticado
- `handle_new_user` / `compute_daily_report_aggregates`: `search_path`, revoke EXECUTE amplo
- Unique parcial Stripe ids; remove plano `free` se existir

**Risco residual enquanto 004 não estiver aplicada:** JWT autenticado pode inserir `usage_events` e `messages` sem restrição de `role` (policies de `001`). O app mitiga o path normal via service role; isso **não** substitui o hardening RLS. Ver auditoria AUD-001.

## Persistência na aplicação

Repositórios em `src/lib/database/repositories/`:

- Memory: apenas quando mocks permitidos e sem env público Supabase
- Supabase: quando `NEXT_PUBLIC_SUPABASE_*` presente

## Admin

Inserir em `admin_roles` via dashboard/SQL — ver `DEPLOYMENT.md`.
