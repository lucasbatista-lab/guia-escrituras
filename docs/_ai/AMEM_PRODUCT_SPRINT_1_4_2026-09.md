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

Pendente.

## Lote 3

Pendente.

## Lote 4

Pendente.

## Migrations

- `20260920000014_user_daily_interactions_and_product_events.sql`

## Testes / riscos / backlog

Preenchidos ao fechar cada lote.
