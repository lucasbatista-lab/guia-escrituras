# Admin — verdade dos dados e UX do operador

**Data:** 2026-07-26  
**Fonte:** código (`src/lib/admin/*`, `src/lib/reports/*`) · **sem** inventar métricas  
**Preços catálogo:** R$38 / R$58 / R$188 (estimativa MRR = preço × assinantes)

---

## 1. Segurança (EVIDÊNCIA)

| Controle | Estado |
|----------|--------|
| `requireAdminUser` em APIs admin | Sim |
| Papel via `admin_roles` (não claim solto no JWT client) | Sim |
| Páginas `/admin/*` atrás do mesmo gate | Sim (layout/session) |
| Service role só server-side | Sim |
| Conteúdo espiritual pessoal de chat no admin | Evitar / não é fonte de “cuidado pastoral” via painel |
| MFA admin | Ausente (dívida aceita curto prazo) |

Acesso direto por URL sem sessão admin → bloqueado pelo auth gate.  
Export/ações: só rotas admin autenticadas; sem ações destrutivas de chat nesta superfície.

---

## 2. Classificação de métricas

Legenda: **REAL** · **DERIVED** · **ESTIMATE** · **SNAPSHOT** · **MOCK** · **PLACEHOLDER** · **NOT_INTEGRATED** · **MISLEADING** (se label UI puder enganar)

| Métrica | Classificação | Origem / nota |
|---------|---------------|---------------|
| `revenueBrlCents` / receita caixa | **NOT_INTEGRATED** | Sempre `null` até ledger Stripe cash |
| MRR catálogo (`mrrCatalogBrlCents`) | **ESTIMATE** + **SNAPSHOT** | Preço catálogo × assinantes efetivos |
| `activeSubscribers` / `activeSubscriberUsers` | **SNAPSHOT** | Momento da query/geração |
| `trialingSubscriberUsers` | **SNAPSHOT** | Status trialing |
| Checkouts started/completed/pending | **REAL** (intents) | `signup_intents` |
| `payment_events_*` | **REAL** | Tabela webhook |
| `cancelingWithAccessCount` | **REAL** (Stripe list) ou null se falha | Live Stripe API |
| AI tokens / requests | **REAL** (events) parcial | `usage_events` — pode ser parcial |
| AI cost BRL | **ESTIMATE** | Planejamento ≠ fatura OpenAI |
| `signupToSubscriberRate` | **DERIVED** | activeSubs / totalUsers |
| Referrals counters | **REAL/DERIVED** conforme schema | Não tratar como receita |
| Retention D1/D7/D30 em daily | **PLACEHOLDER**/0 | Não computado |
| HTTP 409/429/503 chat | **NOT_INTEGRATED** no daily | Só logs |
| Labels UI “MRR” sem “catálogo/estimativa” | **MISLEADING** risco | Preferir copy explícita |

**Observado em relatório 2026-07-25 UTC:** receita “Ainda não integrada”, MRR catálogo R$264, 4 assinantes — coerente com estimate (não caixa).

---

## 3. Páginas — honestidade

| Página | Uso operador | Risco |
|--------|--------------|-------|
| Resumo | Alertas + funil intents + MRR estimate | Confundir MRR com caixa |
| Usuários / detalhe | Suporte | PII; esconder técnico |
| Eventos | Debug | Jargão |
| Relatórios | Decisão diária UTC | Timezone BR vs UTC |
| Uso / custos | Margem estimate | “Custo real” falso |
| Aquisição | UTM/content | Atribuição incompleta |
| Parceiros | Ops afiliados | Ver se comissão/pagamento estão integrados antes de prometer |

---

## 4. Eventos — humanização (proposta)

| Evento técnico (exemplos) | Título humano | Explicação | Ação |
|---------------------------|---------------|------------|------|
| checkout session created / intent started | Checkout iniciado | Usuário abriu pagamento | Se stuck >30m: ver Stripe + intent |
| checkout completed | Checkout concluído | Pagamento/sessão ok | Confirmar assinatura ativa |
| payment_event processed | Webhook processado | Evento Stripe aplicado | Nenhuma se ok |
| payment_event failed / stuck received | Pagamento/webhook com problema | Falha ou lease excedido | Reprocessar / incident billing |
| subscription active | Assinatura ativada | Acesso liberado | — |
| cancel_at_period_end | Cancelamento de renovação | Acesso até fim do período | — |
| usage limit / 429 path | Limite de uso | Quotas | Orientar fair use / upgrade ético |
| crisis_safety_intercept | Resposta de segurança | Sem conteúdo da mensagem | Não abrir chat; só métrica |
| AI provider error | Erro de IA | Turno falhou | Ver status OpenAI / keys |
| journey progress 5xx | Erro de Jornada | RPC/API | Logs + postcheck |
| cron daily-report | Relatório diário | Job UTC | Se missing: CRON_SECRET |

Nunca exibir texto de conversa / crise verbatim.

---

## 5. Relatórios — formato proposto (9 seções)

1. **Resumo executivo** (3 bullets decisão)  
2. **Caixa real** (hoje: “não integrada”)  
3. **Receita recorrente estimada** (MRR catálogo + disclaimer)  
4. **Funil** (intents / checkouts)  
5. **Produto** (turnos, jornadas, deep — sem conteúdo)  
6. **Custos** (IA estimada vs fatura futura)  
7. **Alertas** (past_due, webhooks stuck, report missing)  
8. **Ações recomendadas**  
9. **Nota técnica recolhida** (UTC, snapshot, requestIds)

Timezone: agregar **UTC**; exibir “dia UTC X (Brasília ≈ X−3h)” para reduzir confusão 25 vs 26.

---

## 6. Uso & custos — tradução operacional

| Pergunta do operador | Resposta honesta hoje |
|----------------------|------------------------|
| Quanto gastamos hoje? | **Estimativa** de tokens × tabela interna — não invoice |
| Qual plano consome mais? | Agregar por planKey se events tiverem — senão “dados parciais” |
| Fora do padrão? | Alertas de volume / erros — sem abrir chats |
| Custo médio / assinante? | Estimate / snapshot count |
| Risco de margem? | Comparar estimate IA × MRR catálogo **com disclaimer** |

---

## 7. Parceiros (objetivo vs gaps)

Objetivo típico: UTM, indicação, campanhas, status.  
Antes de operar comissões: confirmar schema/APIs de reward/pagamento. Sem inventar performance.

---

## 8. UX operador (proposta, sem wide impl)

- Labels **ESTIMATIVA** / **NÃO INTEGRADA** / **SNAPSHOT** visíveis  
- Detalhe de usuário: operacional primeiro; “Técnico” recolhido  
- Eventos: título humano + severidade + ação  
- Sem conteúdo pastoral sensível
