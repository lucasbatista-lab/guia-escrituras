# AMÉM CHAT — Sprint produto lotes 1–4

**Modo:** implementação  
**HEAD inicial:** `3083e9ebc169b11cc363fa0774ae1a732a37145e` (`main`)  
**Data:** 2026-09-20

Não repetir auditorias de `AMEM_PRODUCT_APPSTORE_AUDIT_2026-09.md` / `AMEM_PRODUCT_FOUNDATION_V2_2026-09.md`.

## Arquitetura relevante

- FREE = conta confirmada sem subscription live (`confirmed_without_plan`). Sem `plan_key` free. Sem linha Stripe.
- Paid = entitlements existentes (`chat_standard`, `reading_journeys`, `chat_deep`).
- Daily = editorial TypeScript (bible-ready) + `user_daily_interactions` (PII mínimo, RLS own).
- Product events = `product_events` autenticados, sem conteúdo espiritual/privado.
- Timezone autoritativo: `America/Sao_Paulo`.
- Zero LLM no runtime FREE (daily, orações, diário, favoritos).

## Working tree preexistente (não descartado, não commitado nesta sprint)

- `.gitignore` modificado
- `.tmp-runtime-closure/`
- docs `_ai` de auditorias anteriores (untracked)

---

## Lote 1

- FREE = `confirmed_without_plan` → `/inicio` (sem plan_key free).
- Cadastro sem `?plan=` confirma e entra no produto; com `?plan=` o checkout permanece.
- Hoje com Deus editorial (7 fixtures QA, BRT, zero LLM).
- `user_daily_interactions` + `product_events` com RLS own-row.
- Share: Web Share / copiar; sem check-in.
- Chat 402 copy honesta; API de chat continua paga.

## Lote 2

- Regras de voz pastoral no system prompt (menos perguntas, menos clichê, continuidade).
- Scorecard offline cobrindo os temas do lote; live harness 36 casos intacto (opt-in).
- `dailyDate` trusted no chat (registry only); prefill editorial sem check-in.
- Eventos `chat_started` / `first_chat_completed` sem conteúdo de mensagem.
- Safety/crisis/teologia preservados.

## Lote 3

- Entitlement Caminho+ inalterado.
- Experiência de programa: intro, Dia N de 7, oração, conclusão, progresso persistido.
- Prefill de chat com jornada/dia/referência; sem nota pessoal automática.
- Sem streak; progresso `X de 7` via `journey_progress` existente.

## Lote 4

- `user_prayers`, `user_saved_items`, `user_private_entries` com RLS own-row.
- `/espaco` (orações, salvos, diário); FREE e paid.
- Dual-write de salvos diários → `user_saved_items`.
- Momentos do mês a partir de interações reais (sem streak).
- Export da conta inclui orações/salvos/diário.
- Anotação opcional de jornada reusa `user_private_entries` (não vai ao chat).
- Analytics só de ação; zero LLM.

## Migrations

- `20260920000014_user_daily_interactions_and_product_events.sql`
- `20260920000015_personal_spiritual_workspace.sql`

## Testes / riscos / backlog

- Gates: daily, pastoral offline, journeys v2, workspace, auth/export, theology/crisis existentes.
- P1: calendário editorial diário além de 7 fixtures; revisão pastoral de jornadas; account deletion Apple; Bible reader.
- Rollback conceitual: drop policies + drop das tabelas novas (aditivas).
