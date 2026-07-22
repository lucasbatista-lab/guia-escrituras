# MIG 004 — Decision and Validation Pack

**Data:** 2026-07-22
**Finding:** MAE-P0-01
**Arquivo:** `supabase/migrations/20260712000004_production_hardening.sql`
**Estado remoto documentado:** **não aplicada** (`docs/DATABASE.md`).

**Este pacote não aplica a migration.** Nenhum SQL abaixo foi executado nesta rodada de eng.

---

## 1. Objetivo

Endurecer RLS e integridade em produção:

- Impedir que JWT autenticado faça forge de `usage_events`
- Restringir insert de `messages` a `role=user` em conversas próprias
- Remover writes autenticados em `conversation_summaries`
- Endurecer `search_path` / grants de funções security definer
- Índices únicos para request_id e Stripe subscription id

O app já mitiga o path normal via service role; **isso não substitui** o hardening RLS.

---

## 2. Objetos alterados

| Área | Objeto |
|------|--------|
| Policies | `usage_events`, `messages`, `conversation_summaries` |
| Indexes | `usage_events_user_request_id_uidx`, `messages_user_request_role_uidx`, Stripe subscription/customer |
| Functions | `handle_new_user`, `compute_daily_report_aggregates`, `is_admin` |

## 3. Policies removidas

- `usage_events_insert_own`
- `messages_insert_own`
- `conversation_summaries_insert_own`
- `conversation_summaries_update_own`
- (drop idempotente de `messages_insert_own_user_role` antes de recriar)

## 4. Policies criadas

- `messages_insert_own_user_role` — insert authenticated somente se `auth.uid() = user_id` **e** `role = 'user'` **e** conversa própria

## 5. Índices / constraints

- Unique `(user_id, request_id)` em `usage_events`
- Unique parcial `(user_id, request_id, role)` em `messages` onde `request_id is not null`
- Unique parcial `subscriptions.stripe_subscription_id`
- Index `subscriptions.stripe_customer_id`

## 6. Risco de **não** aplicar

- JWT + PostgREST pode inserir usage e messages com role assistant/system (policies 001)
- Duplicatas de usage/messages em retry cross-instance sem unique indexes
- Relatórios/admin com métricas distorcidas se forge ocorrer
- Lock process-local de chat **não** cobre multi-instance; uniques da 004 são mitigação parcial

## 7. Risco de **aplicar**

- Clientes legados que inseriam via anon/authenticated paths quebram (app atual usa service role no path normal — validar)
- Unique indexes falham se já existirem duplicatas — **pré-check obrigatório**
- Funções reescritas: regressão em bootstrap de profile ou daily report se grants errados
- Sem rollback automático seguro documentado além de reverter policies manualmente com cuidado

## 8. Dependências 005–008

| Migration | Relação |
|-----------|---------|
| 001–003 | Base; 004 assume schema existente |
| 005–007 | Independentes de 004; confirmar presença no B00 **antes** da decisão 004 |
| 008 | Já documentada como aplicada; progress RPCs não dependem de 004, mas chat forge residual permanece sem 004 |

**Não** reaplicar 005–008. **Não** editar 004.

## 9–11. Backup e RTO/RPO (decisão Ops — não fato)

**Pré-condição:** backup restaurável do projeto Supabase **antes** do apply.

Definição mínima aceitável (sugerida):

- Snapshot/backup automático Supabase habilitado **ou** dump lógico recente verificado
- Teste de restore em projeto **não prod** pelo menos uma vez (ideal) ou evidência de ponto de restore conhecido
- Janela de apply com Ops disponível

**RTO/RPO inicial sugerido (a confirmar pelo negócio):**

- RPO: ≤ 24h (ou o do plano Supabase vigente)
- RTO: restaurar schema+dados críticos em ≤ 4h úteis

Estes números são **proposta**, não SLA contratado.

---

## 12. SQL SELECT — estado **antes** (read-only)

Executar **somente** no SQL Editor com operador autorizado. Não incluir writes.

```sql
-- Policies relevantes
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename in ('usage_events', 'messages', 'conversation_summaries')
order by tablename, policyname;

-- Indexes 004
select indexname, indexdef
from pg_indexes
where tablename in ('usage_events', 'messages', 'subscriptions')
  and (
    indexname like '%request_id%'
    or indexname like '%stripe_subscription%'
    or indexname like '%stripe_customer%'
  );

-- Duplicatas que bloquearíam unique usage
select user_id, request_id, count(*)
from public.usage_events
where request_id is not null
group by 1, 2
having count(*) > 1
limit 50;

-- Duplicatas messages (user_id, request_id, role)
select user_id, request_id, role, count(*)
from public.messages
where request_id is not null
group by 1, 2, 3
having count(*) > 1
limit 50;
```

## 13. SQL SELECT — estado **depois** (read-only)

```sql
-- Deve existir messages_insert_own_user_role; não deve existir usage_events_insert_own
select policyname from pg_policies
where tablename = 'usage_events';

select policyname from pg_policies
where tablename = 'messages';

select indexname from pg_indexes
where indexname in (
  'usage_events_user_request_id_uidx',
  'messages_user_request_role_uidx',
  'subscriptions_stripe_subscription_id_uidx'
);
```

---

## 14. Tentativas manuais controladas (após apply — ambiente controlado)

Usar **conta teste** JWT authenticated (não service role). Nunca em produção com dados reais sem autorização.

| Teste | Esperado pós-004 |
|-------|------------------|
| Forge insert `usage_events` | **Falhar** |
| Insert `messages` role `assistant` | **Falhar** |
| Insert `messages` role `user` em conversa própria | **Permitir** (se policy allow) |
| Acesso conversa alheia | **Falhar** (já esperado por ownership) |

Documentar evidência (código erro PostgREST). **Não** colar conteúdo espiritual.

## 15–16. Happy paths

| Fluxo | Esperado |
|-------|----------|
| Chat via app (service path) | envio + resposta + usage OK |
| Jornadas progress | start/complete/reset OK (008) |

## 17. Service role

Continua podendo inserir usage/assistant messages. Validar que admin/cron/report ainda funcionam.

## 18. Critérios GO

- B00 confirma 005–007 (ou risco aceito por escrito)
- Backup OK
- Zero duplicatas nos pré-checks
- Decisão humana explícita “aplicar”
- Janela ops + rollback plan lido

## 19. Critérios NO-GO

- Duplicatas não limpas
- Backup ausente
- Chat produção instável
- Mistura test/live Stripe no mesmo momento (ruído ops)
- Tentativa de editar o arquivo da migration

## 20. Interromper se

- Apply parcial (erro no meio do SQL)
- Happy path chat quebra
- Unique index create falha
- Relatório diário quebra autorização

## 21. Rollback manual

Não há `DOWN` migration no repo. Rollback = **restauração de backup** ou recriação manual das policies 001 (alto risco). Preferir restore. Documentar quem autorizou.

## 22. Evidências a guardar

- Timestamp apply
- Operador
- Resultados SELECT antes/depois
- Resultado forge tests
- Chat + Jornadas smoke
- Decisão final assinada (Ops)

## 23. Decisão final (template — preencher humano)

- [ ] **Aplicar** em ____/____/____ por ________
- [ ] **Adiar aceitando risco** até ____ (motivo: ________)
- [ ] **Não aplicar e bloquear lançamento** (motivo: ________)

**Esta linha permanece em branco no repositório até decisão humana.** A migration **não** está aplicada por este documento.

---

## Referências

- `docs/DATABASE.md`
- `docs/DEPLOYMENT.md`
- `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md`
- `tests/persistence-and-migration004.test.ts` (contrato local)
