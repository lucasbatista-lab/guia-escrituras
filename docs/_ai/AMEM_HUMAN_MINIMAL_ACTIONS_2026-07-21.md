# Human Minimal Actions — Ultra-minimal Pre-launch Package

**Data:** 2026-07-21 (sprint 5)
**Regra:** não executar nestas instruções de código. Sem SQL write, migration apply, Stripe live, deploy ou contas reais.

Fonte: este pacote + `AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md` + `AMEM_FINAL_LAUNCH_READINESS_MATRIX_2026-07-21.md`.

---

## OBRIGATÓRIO ANTES DO LANÇAMENTO

### 1. Confirmar SHA em produção

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | Acesso a `/api/health` em produção |
| Passos | 1) Abrir `/api/health` · 2) Anotar `version` / `requestId` · 3) Comparar com tip `main` de lançamento |
| Evidência | JSON health + horário UTC |
| Sucesso | SHA bate com o commit pretendido |
| Falha | SHA desconhecido ou health degradado → **não** seguir cutover |
| Decisão seguinte | Postcheck read-only |

### 2. Postcheck read-only (Jornadas / schema)

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | SQL Editor somente SELECT; tip alinhado |
| Passos | Rodar `supabase/postchecks/20260712000008_journey_progress_postcheck.sql` (ou consolidado) |
| Evidência | Resultado exportado + data |
| Sucesso | Checks esperados verdes sem writes |
| Falha | Pedido de write / ambiente errado → interromper |
| Decisão seguinte | Confirmar 005–007 |

### 3. Confirmar migrations 005–007 (B00)

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | Acesso read-only |
| Passos | SELECT de existência de tabelas/policies 005, 006, 007 |
| Evidência | Lista presente/ausente |
| Sucesso | Objetos esperados presentes |
| Falha | Divergência sem runbook → escalar |
| Decisão seguinte | Decidir MIG 004 |

### 4. Decidir MIG 004

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | Backup; B00 verde; chat happy path documentado |
| Pacote | `docs/_ai/AMEM_MIG004_DECISION_AND_VALIDATION_PACK_2026-07-22.md` (SELECT before/after, GO/NO-GO) |
| Passos | Revisar SQL **sem editar**; seguir pacote; aplicar **somente** com aprovação humana explícita |
| Evidência | Policies novas; forge usage falha; chat OK |
| Sucesso | Policies 004 ativas + chat funcional |
| Falha | Writes assistant quebrados → **não** rollback automático; seguir runbook / restore |
| Decisão seguinte | Smoke residual Jornadas |

### 5. Smoke residual de Jornadas (humano)

Cobrir só o que Vitest **não** cobre (`pnpm test:real-usage`):

1. Login conta teste Caminho
2. Concluir 1 etapa → refresh → progresso
3. Prefill chat sem POST até submit
4. Reset com confirmação
5. Essencial: preview + CTA planos
6. Última etapa marcada **sem** todas as anteriores → **não** celebrar “Jornada concluída” / **sem** CTA “Ver outras jornadas”
7. Após conclusão agregada real (`completedAt`) → CTA “Ver outras jornadas”; refresh mantém estado

| Sucesso | Pass/fail por passo registrado |
| Falha | Persistência falha, falsa celebração, ou Essencial vê etapa integral → bloquear launch feature |
| Decisão seguinte | Revisão pastoral |

### 6. Revisão pastoral (21 etapas)

Checklist em `AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md` + `docs/READING_JOURNEYS.md`.
Sem reescrita teológica nesta sprint de engenharia.

| Sucesso | Aprovação registrada |
| Falha | Conteúdo inaceitável → pausar jornadas públicas se necessário |

### 7. Smoke financeiro

Somente após prep: `docs/_ai/AMEM_FINANCIAL_SMOKE_PREPARATION_2026-07-20.md`.
Contas `*@amemchat.test` / Stripe test. **Parar** se cobrança duplicada, entitlement errado ou 5xx webhook.

Fora até B16: troca de plano, proration, preços R$38/R$58/R$188, live prod.

---

## PODE SER PÓS-LANÇAMENTO

| Item | Motivo |
|------|--------|
| Playwright E2E | Harness de mocks insuficiente (spike 2026-07-21) |
| Search server-side no histórico | Precisa remoto/indexação |
| Favoritos / memória ampliada / personas / áudio | Schema + risco teol./custo |
| Exclusão self-service de conta | Legal + fluxo Auth |
| Receita Stripe no daily report | Integração financeira |
| Lock chat cross-instance definitivo | Depende MIG 004 / lease |
| Streaming `/api/chat` | Escopo pós-MVP |
| Observabilidade agregada de Jornadas | Ops pós-dados reais |

---

## Automação já coberta (não repetir no smoke)

- Matriz auth / entitlement / prefill / crisis / safeNextPath / retention / HC / deep-link (`pnpm test:real-usage`)
- Theology evals CI + journeys
- `launch:check`, lint, test, build
- Retenção V4, chat longo, histórico V4, ativação sessão, admin resumo, security V3 (sprint 5)
