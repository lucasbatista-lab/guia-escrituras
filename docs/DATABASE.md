# Database — Amém Chat

Migrations em `supabase/migrations/`.

## Estado remoto (documentado — atualizado 2026-07-27 pós-GO)

| Migration | Conteúdo | Estado documentado |
|-----------|----------|-------------------|
| `001` foundation | schema + RLS base | **Aplicada** (cutover) |
| `002` seed | catálogo planos/entitlements | **Aplicada** |
| `003` daily report fn | agregados | **Aplicada** |
| `004` production hardening | RLS endurecido + uniques | **Aplicada** em produção (humano, **2026-07-27**) · postcheck `overall_ok=true` · smoke transacional 6/6 · smoke app pós-004 verde |
| `005` signup_intents | intents de cadastro/checkout | **Provável em produção** (código de billing/cadastro depende); **confirmar no B00** se ainda residual |
| `006` stripe billing | `billing_customers`, `payment_events` | **Provável em produção** (webhook depende); **confirmar no B00** se ainda residual |
| `007` legal_consents | consentimentos | **Provável em produção** (cadastro legal depende); **confirmar no B00** se ainda residual |
| `008` journey_progress | progresso de Jornadas + RPCs | **Aplicada** em produção (humano, 2026-07-20 — `END_OF_DAY_MASTER_REPORT`, `NEXT_STEPS`) |
| `009` journey_progress anon hardening | revoga grants de `anon`/`PUBLIC` na tabela + EXECUTE nas RPCs | **Aplicada** em produção (humano, **2026-07-26**) · postcheck consolidado `overall_ok = true` |
| `010` journey_progress complete RPC unnest fix | repara `complete_journey_progress_step` (PG 42883) | **Aplicada** em produção (humano, **2026-07-26**) · checks de função verdes; postcheck `table_grants_ok` falso por grants históricos |
| `011` journey_progress role least privilege | revoga DELETE/TRUNCATE/REFERENCES/TRIGGER de `authenticated` + `service_role` | **Aplicada** em produção (humano, **2026-07-26**) · postcheck `overall_ok = true` |
| `012` journey_progress complete RPC runtime fix | reescreve complete: `merged` + `expected <@ merged` (sem `ANY((SELECT))`) | **Aplicada** em produção (humano, **2026-07-27**) · runtime smoke `overall_ok=true` · Jornada integral 7/7 verde · postcheck estrutural: único campo falso `plpgsql_vars_present` = **falso negativo** (ver abaixo) |
| `013` public_conversion_events | beacons first-party duráveis (funil pago) | **Aplicada** em produção (humano/CLI, **2026-09-04/05 BRT**) · postcheck `overall_ok=true` · ver `docs/ACQUISITION_EVENTS.md` |

**Não** reaplicar migrations já aplicadas. **Não** executar rollback destrutivo sem backup. Postchecks são **somente leitura** (exceto smokes transacionais, que usam `BEGIN`/`ROLLBACK` sem persistir).

Handoff de lançamento: `docs/_ai/AMEM_LAUNCH_GO_HANDOFF_2026-07-28.md`.

### Gap remoto (Jornadas) — fechado pela 009

- Pré-009: `anon` tinha grants explícitos de tabela e EXECUTE nas três RPCs; a superfície anônima dependia **exclusivamente** da RLS (sem vazamento de linhas demonstrado).
- MIG `009` **aplicada 2026-07-26**; postcheck consolidado verde (`overall_ok = true`).
- MIG `004` **aplicada 2026-07-27** (hardening RLS independente das Jornadas).
- **Nota ops:** após a 009, houve observação de HTTP 500 completo em Jornadas em uso real — **sem causalidade provada** com a migration; causa `text = text[]` encerrada pela 012.

### MIG 010/011/012 — causa `text = text[]` encerrada; residual só no postcheck

- MIG `010` **aplicada**: aliases `unnest` corrigidos; postcheck estrutural verde na função — **não** prova execução.
- MIG `011` **aplicada**: privilégio mínimo tabela; `overall_ok = true`.
- MIG `012` **aplicada (2026-07-27)**: reescrita PL/pgSQL (`expected` / `merged` / `is_complete`; `expected <@ merged`).
  - **Runtime smoke** transacional (`…_runtime_smoke.sql`): `start_ok` / `intermediate_ok` / `final_ok` / `reset_ok` / `overall_ok` = **true**.
  - **Smoke humano UI:** Jornada integral 7/7 + `completedAt`; reset OK.
  - **Causa real `text = text[]` / PG 42883:** encerrada no caminho de complete.
  - **Postcheck estrutural** (`…_runtime_fix_postcheck.sql`): reporta `overall_ok=false` **somente** por `plpgsql_vars_present=false`.
  - **Classificação:** falso negativo do postcheck. Em regex PostgreSQL, `\b` é *backspace*, não word boundary. Demais checks (grants, RLS, policies, containment, security_invoker) = true.
  - **Correção futura:** apenas no SQL do postcheck (âncoras POSIX). **Não** criar migration. **Não** reaplicar 012.

Postcheck Jornadas (preferencial pós-009):
`supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql`
(estado documentado pós-009: `overall_ok = true`, incluindo bloqueio anônimo de tabela e RPC.)

Postcheck privilégio mínimo (011):
`supabase/postchecks/20260712000011_journey_progress_role_least_privilege_postcheck.sql`

Postcheck + smoke runtime (012 — aplicada):
`supabase/postchecks/20260712000012_journey_progress_complete_rpc_runtime_fix_postcheck.sql` ← falso negativo `plpgsql_vars_present`
`supabase/postchecks/20260712000012_journey_progress_complete_rpc_runtime_smoke.sql` ← **verde**

### MIG 004 — aplicada 2026-07-27

Pacote: `docs/_ai/AMEM_MIG004_DECISION_AND_VALIDATION_PACK_2026-07-22.md`.

| Etapa | Resultado |
|-------|-----------|
| Aplicação humana | Feita (reaplicação idempotente / Success) |
| Postcheck | `overall_ok=true` |
| Smoke transacional | 6/6 — forge assistant bloqueado; forge usage bloqueado; cross-user bloqueado; escrita legítima preservada; rollback executado |
| Smoke app pós-004 | chat Profundo 200; Deep 200; Jornada complete 200; chat Essencial 200; gating Essencial correto; sem 42501 / 42883 / 5xx |

**Não** reaplicar. Rollback = restore de backup (sem DOWN migration).

## Arquivos

1. `20260712000001_foundation_schema.sql` — schema + RLS (não alterar)
2. `20260712000002_seed_catalog.sql` — catálogo (não alterar)
3. `20260712000003_daily_report_fn.sql` — agregados (não alterar)
4. `20260712000004_production_hardening.sql` — hardening (**aplicada 2026-07-27**; não reaplicar)
5. `20260712000005_signup_intents.sql` — intents
6. `20260712000006_stripe_billing.sql` — customers + payment_events
7. `20260712000007_legal_consents.sql` — consentimentos
8. `20260712000008_journey_progress.sql` — progresso de Jornadas (aplicada; não reaplicar)
9. `20260712000009_journey_progress_anonymous_access_hardening.sql` — endurece grants anônimos (**aplicada 2026-07-26**; não reaplicar; não editar 008)
10. `20260712000010_journey_progress_complete_rpc_unnest_fix.sql` — repara aliases unnest (**aplicada**; não reaplicar; não editar 008–009)
11. `20260712000011_journey_progress_role_least_privilege.sql` — privilégio mínimo tabela (**aplicada**; não reaplicar; não editar 008–010)
12. `20260712000012_journey_progress_complete_rpc_runtime_fix.sql` — reescrita runtime complete (**aplicada 2026-07-27**; não reaplicar; não editar 008–011)
13. `20260904000013_public_conversion_events.sql` — eventos first-party do funil (**aplicada**; apply/rollback em `docs/ACQUISITION_EVENTS.md`)

## Migration 004 (resumo — aplicada)

- Remove insert autenticado em `usage_events`; unique `(user_id, request_id)`
- Messages: authenticated só `role=user` + ownership da conversation
- Summaries: sem insert/update autenticado
- `handle_new_user` / `compute_daily_report_aggregates`: `search_path`, revoke EXECUTE amplo
- Unique parcial Stripe ids; remove plano `free` se existir

P0 de forge via JWT **fechado** em produção após apply + smokes (ver handoff).

## Persistência na aplicação

Repositórios em `src/lib/database/repositories/`:

- Memory: apenas quando mocks permitidos e sem env público Supabase
- Supabase: quando `NEXT_PUBLIC_SUPABASE_*` presente

## Admin

Inserir em `admin_roles` via dashboard/SQL — ver `DEPLOYMENT.md`.
