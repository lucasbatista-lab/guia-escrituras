# Financial Smoke Preparation — 2026-07-20

**Somente leitura / mocks.** Nenhuma chamada Stripe real. Nenhum preço, webhook ou quota alterados nesta sprint.

## Objetivo

Deixar um roteiro e fixtures para smoke financeiro **futuro** (humano + mocks), após Jornadas smoke e sem plan change/proration.

## Fixtures propostas (já parcialmente cobertas em testes)

Localização atual: `tests/stripe-*.test.ts`, `tests/checkout-*.test.ts`, `tests/native-subscription.test.ts`.

| Evento | Esperado no app | Idempotência |
|--------|-----------------|--------------|
| `checkout.session.completed` | Completa signup intent | duplicate ACK |
| `customer.subscription.created` | Upsert subscription | lease claim |
| `customer.subscription.updated` | Sync status/plan | out-of-order safe? |
| `customer.subscription.deleted` | canceled | — |
| `invoice.paid` | referral / side effects | — |
| `invoice.payment_failed` | past_due | — |
| Signature inválida | 400 | — |
| Mode mismatch live/test | 400 | — |
| Evento duplicado processed | ACK duplicate | sim |
| in_flight lease | 409 | retry Stripe |

## Matriz de estados de assinatura

| Status | Entitlement chat | UI esperada |
|--------|------------------|-------------|
| active / trialing | sim | platform |
| past_due | tipicamente bloqueio journey paywall | `/planos` ou destino journey-state |
| canceled / unpaid / incomplete | não | planos / continuar |
| Particular | provisionado manual | sem checkout |

## Roteiro de smoke financeiro (humano — futuro)

1. Conta teste + price IDs live alinhados  
2. Checkout Essencial valor mínimo  
3. Webhook dashboard: eventos received→processed  
4. Retorno `/assinatura/sucesso`  
5. Conta mostra plano  
6. Chat 1 mensagem (custo OpenAI explícito)  
7. Portal / cancel at period end  
8. `invoice.payment_failed` simulado em test mode (não prod)  
9. Critério interrupção: cobrança duplicada, entitlement errado, webhook 5xx persistente  

## Critérios de aprovação

- Assinatura efetiva = planKey esperado  
- Sem double charge  
- Cancelamento não remove acesso antes do period end  
- Admin vê past_due / eventos sem PII de cartão  

## Condições de interrupção

- Qualquer write em preço/quota  
- Webhook secret errado em prod  
- Proration/plan change iniciado sem B16  

## Comando proposto (ainda não no package.json)

```text
pnpm test:billing:mock   # subset vitest stripe-* + checkout-*
```

Usar até existir script dedicado:  
`pnpm exec vitest run tests/stripe-webhook-hardening.test.ts tests/stripe-billing.test.ts tests/checkout-live-failures.test.ts`

## Status nesta sprint

- Preparação documental: **feita**  
- Fixtures novas: **não necessárias** (cobertura existente forte)  
- Smoke live: **não executado** (proibido sem runbook humano)
