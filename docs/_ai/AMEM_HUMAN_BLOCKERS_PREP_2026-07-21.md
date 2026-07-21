# Human Blockers Preparation — Third Sprint (2026-07-21)

Instruções curtas e auditáveis. **Não executar** nesta sprint de código: sem SQL remoto, migrations apply, Stripe live, deploy ou contas reais.

---

## B00 — Confirmação remota read-only

1. Abrir `/api/health` em produção; registrar `sha` / `requestId` / checks seguros.
2. SQL Editor (somente SELECT): confirmar existência de tabelas/policies das migrations **005**, **006**, **007**.
3. Confirmar se policies **004** existem (`messages_insert_own_user_role` vs `messages_insert_own`).
4. Rodar postcheck **read-only** de Jornadas:  
   `supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql` (ou o consolidado vigente).
5. Evidência: capturas/export CSV de resultados + data/hora UTC + SHA do health.

**Abortar se:** qualquer write for solicitado; ambiente não for o esperado.

---

## MIG 004 — Preparação (não aplicar agora)

| Item | Conteúdo |
|------|----------|
| Objetivo | Endurecer RLS: usage_events sem insert autenticado; messages só `role=user` + ownership |
| Risco | Alto — quebra writes client legítimos se app ainda depender de policies frouxas |
| Pré-check | Backup; B00 verde; chat happy path atual documentado |
| SQL | `supabase/migrations/20260712000004_production_hardening.sql` (**não editar**) |
| Postcheck | Policies novas presentes; forge usage falha; chat OK via service role |
| Rollback | **Apenas documental** — não executar rollback automático |
| Abortar se | Chat de prod falhar no smoke; policies 004 ausentes após apply; writes assistant quebrados |

---

## Smoke humano residual — Jornadas

Cobrir só o que a automação Vitest **não** cobre:

1. Login real Caminho em staging/prod controlada (conta teste).
2. Abrir jornada → concluir 1 etapa → refresh → progresso persiste.
3. Prefill chat: textarea preenchido; **nenhum** POST até submit.
4. Reset com confirmação explícita.
5. Essencial: preview + CTA planos, sem acesso à etapa.

Registrar: plano, slug, horário, resultado pass/fail.

---

## Revisão pastoral humana — 21 etapas

Checklist editorial objetivo (sem reescrever teologia nesta sprint):

- [ ] Nenhuma etapa afirma ser Jesus/Deus/revelação  
- [ ] Notas de segurança presentes onde o tema exige (ansiedade, perdão/limites)  
- [ ] Perguntas pessoais não pedem dados clínicos/confessionais sensíveis para persistir  
- [ ] Ações práticas são concretas e sem pressão espiritual  
- [ ] Tom ecumênico respeita tradições listadas no produto  

Base: `docs/READING_JOURNEYS.md` + arquivos em `src/lib/journeys/journeys/`.

---

## Smoke financeiro (futuro — mock primeiro)

Sequência mínima:

1. Conta teste + price IDs alinhados (test mode).  
2. Checkout Essencial valor mínimo.  
3. Webhook: received → processed (dashboard).  
4. Retorno `/assinatura/sucesso` + plano na conta.  
5. Um turno de chat (custo OpenAI explícito e consciente).  
6. Portal / cancel at period end.  
7. (Test mode) `invoice.payment_failed` → past_due esperado.

**Dados:** e-mails `*@amemchat.test` / Stripe test — nunca usuários reais.

**Evidências:** event ids, subscription id mascarado, screenshots de status.

**Parar se:** cobrança duplicada, entitlement errado, webhook 5xx persistente, qualquer alteração de preço/quota/webhook.

Ver também: `docs/_ai/AMEM_FINANCIAL_SMOKE_PREPARATION_2026-07-20.md`.

---

## Fora de escopo até B16

Troca de plano, proration, Stripe live prod, alteração de R$38 / R$58 / R$188.
