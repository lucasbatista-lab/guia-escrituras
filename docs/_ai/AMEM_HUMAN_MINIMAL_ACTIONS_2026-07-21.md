# Human Minimal Actions — Pre-launch Package

**Data:** 2026-07-21  
**Regra:** não executar nestas instruções de código. Sem SQL write, migration apply, Stripe live, deploy ou contas reais.

Fonte consolidada: `docs/_ai/AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md` + este pacote.

---

## 1. Confirmar SHA em produção

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | Acesso a `/api/health` em produção |
| Passos | 1) Abrir `/api/health` · 2) Anotar `sha` / `requestId` · 3) Comparar com tip `main` esperado |
| Evidência | JSON health + horário UTC |
| Sucesso | SHA bate com o commit de lançamento pretendido |
| Interromper se | SHA desconhecido ou health degradado |
| Próximo | Postcheck read-only |

---

## 2. Postcheck read-only (Jornadas / schema)

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | SQL Editor somente SELECT; tip alinhado |
| Passos | Rodar `supabase/postchecks/20260712000008_journey_progress_postcheck.sql` (ou consolidado vigente) |
| Evidência | Resultado exportado + data |
| Sucesso | Checks esperados verdes sem writes |
| Interromper se | Pedido de write / ambiente errado |
| Próximo | Confirmar 005–007 |

---

## 3. Confirmar migrations 005–007

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | B00 read-only |
| Passos | SELECT de existência de tabelas/policies das migrations 005, 006, 007 |
| Evidência | Lista presente/ausente |
| Sucesso | Objetos esperados presentes |
| Interromper se | Divergência sem runbook |
| Próximo | Decidir MIG 004 |

---

## 4. Decidir MIG 004

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | Backup; B00 verde; chat happy path documentado |
| Passos | Revisar SQL **sem editar**; janela ops; aplicar **somente** com aprovação humana explícita |
| Evidência | Policies novas; forge usage falha; chat OK |
| Sucesso | Policies 004 ativas + chat funcional |
| Interromper se | Writes assistant quebrados / smoke chat falha |
| Próximo | Smoke residual Jornadas |

**Não** executar rollback automático.

---

## 5. Smoke residual de Jornadas (humano)

Cobrir só o que Vitest **não** cobre (ver `pnpm test:real-usage`):

1. Login conta teste Caminho  
2. Concluir 1 etapa → refresh → progresso  
3. Prefill chat sem POST até submit  
4. Reset com confirmação  
5. Essencial: preview + CTA planos  

| Sucesso | Pass/fail por passo registrado |
| Interromper se | Persistência falha ou Essencial vê etapa integral |

---

## 6. Revisão pastoral (21 etapas)

Checklist em `AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md` + `docs/READING_JOURNEYS.md`.  
Sem reescrita teológica nesta sprint de engenharia.

---

## 7. Smoke financeiro

Somente após prep: `docs/_ai/AMEM_FINANCIAL_SMOKE_PREPARATION_2026-07-20.md`.  
Contas `*@amemchat.test` / Stripe test. **Parar** se cobrança duplicada, entitlement errado ou 5xx webhook.

Fora até B16: troca de plano, proration, preços R$38/R$58/R$188, live prod.

---

## Automação já coberta (não repetir no smoke)

- Matriz auth / entitlement / prefill / crisis / safeNextPath / retention / HC / deep-link login (`pnpm test:real-usage`)
- Theology evals CI + journeys
- `launch:check`, lint, test, build
