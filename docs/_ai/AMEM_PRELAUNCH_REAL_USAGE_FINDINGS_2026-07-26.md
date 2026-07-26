# Achados de uso real pré-lançamento

**Data:** 2026-07-26  
**Lançamento planejado:** 2026-07-28  
**HEAD tip origem:** `eda920e` · **fixes locais:** pending deploy  
**Produção publicada:** `461736d`  
**MIG 009:** aplicada 2026-07-26 · postcheck `overall_ok=true`  
**MIG 004:** **não** aplicada  
**Preços:** R$38 / R$58 / R$188 imutáveis

---

## Veredito 28/07

**Condicional GO** — lançar só se: (1) deploy dos fixes locais críticos, (2) smoke autenticado completo, (3) reteste sintético de crise em produção.

**Não** nesta janela: redesign público amplo · aplicar MIG 004 sem pack GO · implementar plan change · criar cupons via agent.

---

## P0

| Item | Evidência | Estado | Ação |
|------|-----------|--------|------|
| Jornadas HTTP 500 | Observado em uso real; masking de erro corrigido **localmente**; causa raiz RPC **não** provada | Pós-009: 500 completo observado **sem causalidade provada** com a 009 | Deploy fix masking · **logs prod** pós-deploy · smoke jornadas |
| Crise FN | “considerando não viver mais” → modelo chamado (sem CVV no excerpt) | Fix local detector+template+skip preferDeep | Deploy + reteste sintético |
| Qualidade Deep | Wiring OK; gap = prompt/modelo (**HIPÓTESE**) | Docs-only | Review humano; não bloqueia se copy honesta |

Docs: `AMEM_CRISIS_RUNTIME_*` · `AMEM_DEEP_RESPONSE_*`.

---

## P1

| Item | Ação |
|------|------|
| Cupons / validação $ | ROTA A test mode (`AMEM_LOW_COST_STRIPE_*`) |
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
| Deploy fixes (crise + jornadas error UX / correlatos locais) | Sim |
| Smoke autenticado (chat, jornadas, conta, checkout test) | Sim |
| Crise sintético em prod (188 presente, sem biblia longa) | Sim |
| Confirmar SHA prod = tip de lançamento escolhido | Sim |
| Aplicar MIG 004 | **Não**, salvo GO do pack |
| Redesign antes do launch | **Não** |
| Inventar taxa de conversão / depoimentos | **Não** |

---

## Ordem de execução sugerida

1. Deploy local fixes → verificar `/api/health` SHA  
2. Reteste crise + smoke jornadas + logs se 500 persistir  
3. Stripe ROTA A  
4. Counsel legal mínimo  
5. Cutover checklist  
6. Pós: admin labels, plan-change decisão, redesign

---

## Índice dos docs desta rodada

| Doc |
|-----|
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
