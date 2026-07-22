# Financial Smoke Preparation — 2026-07-20 (hardened 2026-07-22)

**Somente leitura / mocks nesta fase de eng.** Nenhuma chamada Stripe real nestes docs. Nenhum preço, webhook ou quota alterados pelo pacote de hardening local.

**Findings:** MAE-P0-02 · UG-07 (playbook irmão: `AMEM_CHARGEBACK_AND_PAYMENT_DISPUTE_PLAYBOOK_2026-07-22.md`)

## Objetivo

Roteiro e evidências para smoke financeiro **humano** em ambiente de **teste** (Stripe test mode), após B00 e sem plan change/proration.

Preços canônicos (não alterar): **R$38 / R$58 / R$188** (Essencial / Caminho / Profundo). Particular **sem** checkout.

## Fixtures locais (Vitest — não substituem smoke)

`tests/stripe-*.test.ts`, `tests/checkout-*.test.ts`, `tests/native-subscription.test.ts`.

| Evento | Esperado no app | Idempotência |
|--------|-----------------|--------------|
| `checkout.session.completed` | Completa signup intent | duplicate ACK |
| `customer.subscription.created` | Upsert subscription | lease claim |
| `customer.subscription.updated` | Sync status/plan | out-of-order safe? |
| `customer.subscription.deleted` | canceled | — |
| `invoice.paid` | side effects | — |
| `invoice.payment_failed` | past_due | — |
| Signature inválida | 400 | — |
| Mode mismatch live/test | 400 | — |
| Evento duplicado processed | ACK duplicate | sim |
| in_flight lease | 409 | retry Stripe |

## Matriz de estados de assinatura

| Status | Entitlement chat | UI esperada |
|--------|------------------|-------------|
| active / trialing | sim | platform |
| past_due | tipicamente bloqueio | planos / conta |
| canceled / unpaid / incomplete | não | planos / continuar |
| Particular | provisionado manual | sem checkout |

---

## Os 12 testes obrigatórios (humano — test mode)

Para cada teste: usar contas **sintéticas**; redigir e-mails reais em tickets; nunca colar PAN/CVV; limpar assinaturas de teste ao final quando o roteiro pedir.

### 1. Checkout Essencial R$38

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | Stripe test keys; `STRIPE_PRICE_ESSENCIAL` = price com amount 3800 BRL; usuário sem sub ativa |
| Conta | e-mail teste Essencial |
| Evento | Checkout Session completa |
| Evidência | Dashboard Stripe session + linha em `subscriptions` / plano na conta |
| Esperado | Plano Essencial ativo; valor R$38; chat liberado |
| Interromper se | amount ≠ 3800; plano errado; double session charge |
| Redigir | e-mail real, customer id em docs públicos |
| Limpar | cancelar sub teste após evidência |
| Risco | price ID errado em env |

### 2. Checkout Caminho R$58

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | `STRIPE_PRICE_CAMINHO` amount 5800 |
| Conta | e-mail teste Caminho |
| Evento | Checkout Session completa |
| Evidência | plano Caminho + Jornadas entitlement |
| Esperado | R$58; `/jornadas` acessível |
| Interromper se | amount/plano divergente |
| Redigir | PII |
| Limpar | sim |
| Risco | confusão Essencial/Caminho price IDs |

### 3. Checkout Profundo R$188

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | `STRIPE_PRICE_PROFUNDO` amount 18800 |
| Conta | e-mail teste Profundo |
| Evento | Checkout Session completa |
| Evidência | plano Profundo; Aprofundar elegível |
| Esperado | R$188; deepen on-demand OK |
| Interromper se | amount/plano errado |
| Redigir | PII |
| Limpar | sim |
| Risco | custo OpenAI deepen em smoke — 1 mensagem só |

### 4. Particular não inicia checkout

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | UI `/mensagens-personalizadas` / CTA request_access |
| Conta | qualquer autenticado |
| Evento | tentativa de checkout Particular |
| Evidência | erro/bloqueio server-side; sem Session Stripe |
| Esperado | nenhum charge; copy consultiva |
| Interromper se | Session criada |
| Redigir | — |
| Limpar | N/A |
| Risco | CTA mal ligado a price ID |

### 5. `checkout.session.completed` seguido de `subscription.updated`

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | webhook endpoint test apontando ao app |
| Conta | checkout recente |
| Evento | ordem session.completed → subscription.updated (ou created/updated) |
| Evidência | `payment_events` claim; perfil com planKey |
| Esperado | entitlement final coerente; sem estado intermediário preso |
| Interromper se | perfil sem plano após ambos processados |
| Redigir | payload Stripe completo em tickets |
| Limpar | — |
| Risco | out-of-order |

### 6. Binding incorreto de usuário rejeitado

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | fixture/teste local já cobre; smoke: metadata userId adulterado se harness permitir |
| Conta | A vs B |
| Evento | webhook com customer/session amarrado ao user errado |
| Evidência | rejeição / não ACK de binding (`WebhookBindingError`) |
| Esperado | user B **não** recebe plano de A |
| Interromper se | entitlement cruzado |
| Redigir | user ids |
| Limpar | sim |
| Risco | segurança financeira |

### 7. Replay de webhook idempotente

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | evento já `processed` |
| Conta | mesma do checkout |
| Evento | reenvio do mesmo `event.id` |
| Evidência | ACK duplicate; sem segunda sub |
| Esperado | uma assinatura; sem double charge app-side |
| Interromper se | segunda linha de sub ativa |
| Redigir | — |
| Limpar | — |
| Risco | lease/claim bug |

### 8. `cancel_at_period_end` mantém acesso até o prazo

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | sub active |
| Conta | assinante teste |
| Evento | cancelamento nativo (period end) |
| Evidência | Stripe `cancel_at_period_end=true`; app ainda entitles até `period_end` |
| Esperado | chat/Jornadas até o fim do período |
| Interromper se | corte imediato indevido |
| Redigir | — |
| Limpar | deixar expirar ou reativar |
| Risco | sync status prematuro |

### 9. Reativação

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | sub canceling (`cancel_at_period_end`) |
| Conta | mesma |
| Evento | reactivate |
| Evidência | flag limpa; status active |
| Esperado | continuidade sem novo checkout obrigatório |
| Interromper se | exige novo pagamento indevido |
| Redigir | — |
| Limpar | — |
| Risco | portal vs ação nativa |

### 10. `past_due`

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | test clock / invoice.payment_failed simulável |
| Conta | assinante |
| Evento | `invoice.payment_failed` → status past_due |
| Evidência | admin alerta past_due; entitlement conforme política atual |
| Esperado | UI honesta; sem cobrança fantasma |
| Interromper se | acesso full indevido ou lockout sem mensagem |
| Redigir | — |
| Limpar | pagar invoice teste |
| Risco | política entitlement past_due |

### 11. Portal

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | customer Stripe ligado ao user |
| Conta | assinante |
| Evento | `POST /api/billing/portal` → Stripe Customer Portal |
| Evidência | URL portal; retorno ao app |
| Esperado | portal **não** vende troca de plano Amém (honesty) |
| Interromper se | portal inicia upgrade/proration não suportada |
| Redigir | — |
| Limpar | — |
| Risco | config portal Stripe |

### 12. Success page `processing` → active + coerência admin

| Campo | Conteúdo |
|-------|----------|
| Pré-condição | checkout pago; webhook pode atrasar segundos |
| Conta | checkout recente |
| Evento | `/assinatura/sucesso` polling até DB active |
| Evidência | UI processing depois active; admin lista plano correto; receita Stripe **pode** permanecer null |
| Esperado | usuário não fica eternamente em processing; admin não mostra plano errado |
| Interromper se | processing > SLA ops (ex. 5 min) com webhook falho |
| Redigir | — |
| Limpar | — |
| Risco | webhook secret/env |

---

## Critérios de aprovação globais

- Assinatura efetiva = planKey esperado
- Sem double charge
- Cancelamento não remove acesso antes do period end
- Admin vê past_due / eventos sem PII de cartão
- Particular sem Session
- Health **não** usado como prova financeira

## Condições de interrupção globais

- Qualquer write em preço/quota
- Webhook secret errado
- Proration/plan change iniciado
- Mode live/test misturado
- Entitlement cruzado entre usuários

## Comando local (mocks)

```text
pnpm exec vitest run tests/stripe-webhook-hardening.test.ts tests/stripe-billing.test.ts tests/checkout-live-failures.test.ts
```

## Status

- Preparação documental 12 testes: **feita (2026-07-22)**
- Chargeback playbook: `AMEM_CHARGEBACK_AND_PAYMENT_DISPUTE_PLAYBOOK_2026-07-22.md`
- Smoke live: **não executado** nesta rodada
