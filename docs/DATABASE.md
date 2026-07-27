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
| `009` journey_progress anon hardening | revoga grants de `anon`/`PUBLIC` na tabela + EXECUTE nas RPCs | **Aplicada** em produção (humano, **2026-07-26**) · postcheck consolidado `overall_ok = true` |
| `010` journey_progress complete RPC unnest fix | repara `complete_journey_progress_step` (PG 42883) | **Aplicada** em produção (humano, **2026-07-26**) · checks de função verdes; postcheck `table_grants_ok` falso por grants históricos |
| `011` journey_progress role least privilege | revoga DELETE/TRUNCATE/REFERENCES/TRIGGER de `authenticated` + `service_role` | **Não aplicada** — apply humano + postcheck 011 |

**Não** reaplicar migrations. **Não** executar rollback. Postchecks são **somente leitura**.

### Gap remoto (Jornadas) — fechado pela 009

- Pré-009: `anon` tinha grants explícitos de tabela e EXECUTE nas três RPCs; a superfície anônima dependia **exclusivamente** da RLS (sem vazamento de linhas demonstrado).
- MIG `009` **aplicada 2026-07-26**; postcheck consolidado verde (`overall_ok = true`).
- MIG `004` permanece **separada** e **não aplicada**.
- **Nota ops:** após a 009, houve observação de HTTP 500 completo em Jornadas em uso real — **sem causalidade provada** com a migration; investigar via logs pós-deploy dos fixes locais (ver `docs/_ai/AMEM_PRELAUNCH_REAL_USAGE_FINDINGS_2026-07-26.md`).

### MIG 010 aplicada + residual de grants (011)

- MIG `010` **aplicada 2026-07-26**: função `complete_journey_progress_step` corrigida (`unnest` com aliases de coluna); checks de função / RLS / policies / RPC EXECUTE verdes.
- Postcheck 010 revelou `table_grants_ok = false`: `authenticated` e `service_role` ainda tinham DELETE/TRUNCATE/REFERENCES/TRIGGER históricos (GRANT é aditivo; 009/010 não os removeram). **Nenhum vazamento de linhas demonstrado** (RLS + ownership + SECURITY INVOKER).
- MIG `011` fecha o privilégio mínimo — **ainda não aplicada**. Próximo gate: apply humano → postcheck 011 → smoke das Jornadas.

Postcheck Jornadas (preferencial pós-009):
`supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql`  
(estado documentado pós-009: `overall_ok = true`, incluindo bloqueio anônimo de tabela e RPC.)

Postcheck privilégio mínimo (após apply 011):
`supabase/postchecks/20260712000011_journey_progress_role_least_privilege_postcheck.sql`

## Arquivos

1. `20260712000001_foundation_schema.sql` — schema + RLS (não alterar)
2. `20260712000002_seed_catalog.sql` — catálogo (não alterar)
3. `20260712000003_daily_report_fn.sql` — agregados (não alterar)
4. `20260712000004_production_hardening.sql` — hardening (aplicar manualmente depois, com aprovação)
5. `20260712000005_signup_intents.sql` — intents
6. `20260712000006_stripe_billing.sql` — customers + payment_events
7. `20260712000007_legal_consents.sql` — consentimentos
8. `20260712000008_journey_progress.sql` — progresso de Jornadas (aplicada; não reaplicar)
9. `20260712000009_journey_progress_anonymous_access_hardening.sql` — endurece grants anônimos (**aplicada 2026-07-26**; não reaplicar; não editar 008)
10. `20260712000010_journey_progress_complete_rpc_unnest_fix.sql` — repara complete RPC (**aplicada 2026-07-26**; não reaplicar; não editar 008–009)
11. `20260712000011_journey_progress_role_least_privilege.sql` — privilégio mínimo tabela (**não aplicada**; não editar 008–010)

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
