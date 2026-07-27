# Achados de uso real pré-lançamento

**Data:** 2026-07-26 (atualizado pós-reteste prod `2b2fcbf`)  
**Lançamento planejado:** 2026-07-28  
**Produção confirmada:** `2b2fcbf` (`/api/health` · runtime production)  
**MIG 009:** aplicada 2026-07-26 · postcheck `overall_ok=true`  
**MIG 004:** **não** aplicada  
**Preços:** R$38 / R$58 / R$188 imutáveis  
**Stripe live smoke:** **depois** dos P0 — não bloqueia investigação atual, mas **não** declara GO

---

## Veredito 28/07

**NO-GO** para lançamento nesta atualização.

Motivos:

1. Jornada permanece **503** em produção; causa remota **ainda não** lida nos logs nesta execução.  
2. Crise teve **falso negativo** em formulação explícita sob Aprofundar (fix local pronto; falta deploy + smoke).  
3. Um de três testes Deep foi **objetivamente incompleto** (intro+refs+CTA sem corpo) e era aceito como sucesso (guard local pronto; falta deploy + smoke).

**Não** nesta janela: redesign público · MIG 004 · plan change · cupons via agent · Stripe live como substituto dos P0.

Relatório P0: `AMEM_P0_PRODUCTION_RETEST_2026-07-26.md`.

---

## P0 (estado após reteste `2b2fcbf`)

| Item | Evidência | Estado | Ação |
|------|-----------|--------|------|
| Jornadas HTTP 503 | `POST …/complete` → 503 + `persist_failed` após `2b2fcbf` | Causa remota **não** lida (Vercel não linkada nesta máquina) | Operador: logs `journey_progress_rpc_failed`; **sem** fix especulativo |
| Crise FN | “não continuar vivo” + “me manter seguro” + Aprofundar → modelo + Deep UI | Fix local detector+template | Deploy + smoke sintético |
| Deep incompleto | 1/3 respostas: intro+footer+refs+CTA sem corpo | Guard estrutural local (`ai_incomplete`) | Deploy + smoke 3 prompts |

---

## P1

| Item | Ação |
|------|------|
| Cupons / validação $ | ROTA A test mode (`AMEM_LOW_COST_STRIPE_*`) — **após** P0 |
| Plan change | Decision pack D/E — **não** implementar agora |
| Admin truth labels | `AMEM_ADMIN_DATA_TRUTH_*` |
| Legal review | Gaps counsel — `AMEM_LEGAL_PAGES_*` |

---

## P2 / pós

Redesign público (`AMEM_PUBLIC_UX_*`) · evolução visual autenticada · MIG 004 com pack · receita Stripe no daily · A/B conversão com métricas **reais**.

---

## Condições explícitas para 28/07

| Condição | Obrigatório |
|----------|-------------|
| Identificar causa do 503 de Jornadas nos logs + correção causal | Sim |
| Deploy fixes crise + Deep incompleto | Sim |
| Smoke autenticado (chat, jornadas, conta, checkout test) | Sim |
| Crise sintético em prod (188/192, sem biblia longa, sem Deep) | Sim |
| Deep: nenhum sucesso oco (intro-only) | Sim |
| Confirmar SHA prod = tip de lançamento | Sim |
| Stripe live smoke | Depois dos P0 |
| Aplicar MIG 004 | **Não**, salvo GO do pack |
| Redesign antes do launch | **Não** |

---

## Ordem de execução sugerida

1. Operador: extrair `journey_progress_rpc_failed` da Vercel → correção causal de Jornadas  
2. Deploy fixes crise + Deep → `/api/health` SHA  
3. Smoke P0 (crise, Deep×3, jornadas)  
4. Stripe ROTA A  
5. Counsel legal mínimo / cutover  

---

## Índice dos docs desta rodada

| Doc |
|-----|
| `AMEM_P0_PRODUCTION_RETEST_2026-07-26.md` |
| `AMEM_CRISIS_RUNTIME_PRODUCTION_RESPONSE_REVIEW_2026-07-26.md` |
| `AMEM_DEEP_RESPONSE_VALUE_AND_RUNTIME_AUDIT_2026-07-26.md` |
| `AMEM_LOW_COST_STRIPE_VALIDATION_PLAN_2026-07-26.md` |
| `AMEM_AUTOMATIC_PLAN_CHANGE_DECISION_PACK_2026-07-26.md` |
| `AMEM_SUPABASE_USER_OPERATIONS_GUIDE_2026-07-26.md` |
| `AMEM_ADMIN_DATA_TRUTH_AND_OPERATOR_UX_AUDIT_2026-07-26.md` |
| `AMEM_LEGAL_PAGES_LAUNCH_GAP_REVIEW_2026-07-26.md` |
| `AMEM_HIGH_CONVERSION_PUBLIC_EXPERIENCE_AUDIT_2026-07-26.md` |
| `AMEM_PUBLIC_UX_VISUAL_REDESIGN_SPEC_2026-07-26.md` |
| `AMEM_AUTHENTICATED_PRODUCT_VISUAL_EVOLUTION_SPEC_2026-07-26.md` |
| este arquivo |
