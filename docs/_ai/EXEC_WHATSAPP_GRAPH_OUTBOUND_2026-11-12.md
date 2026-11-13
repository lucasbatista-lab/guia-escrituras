# EXEC — WhatsApp Graph Outbound Sender + Delivery Status (2026-11-12)

Escopo fechado: cliente Graph textual · claim outbox · worker send · status webhook · sem chamada real · sem cron · sem push/deploy.

Parte do HEAD da Execution 2 (`dd5337b`).

---

## 1. Base Git

| Item | Valor |
|------|-------|
| Worktree | `C:\Users\Giulia\guia-escrituras-funnel-edge` |
| Branch | `cursor/whatsapp-channel-foundation` |
| HEAD inicial | `dd5337b` |

## 2. HEAD inicial / final

Inicial: `dd5337b`  
Final: tip após commits abaixo (`git rev-parse HEAD`)

## 3. Commits

1. feat(whatsapp): add Meta Graph outbound client
2. feat(whatsapp): add durable outbound delivery worker
3. feat(whatsapp): reconcile Meta delivery statuses
4. test(whatsapp): cover outbound and delivery safety
5. docs(whatsapp): document Graph sender execution

Sem push / PR / deploy.

## 4. Migration 021

`supabase/migrations/20261112000021_whatsapp_outbound_delivery.sql`

- Statuses: pending, sending, sent, delivered, read, retry, delivery_unknown, failed, cancelled
- Colunas: last_attempt_at, delivered_at, read_at, failed_at, provider_error_code, delivery_status_updated_at, claim_token
- Unique parcial em `provider_message_id`
- RPCs: claim / complete / retry / delivery_unknown / failed / cancel / release leases / apply_delivery_status
- **Não aplicada remotamente**

## 5. Feature flags

- `WHATSAPP_CHANNEL_ENABLED` — canal geral
- `WHATSAPP_OUTBOUND_ENABLED` — envio (independente, default OFF)
- Send requer **ambas** true
- Credenciais sozinhas nunca habilitam

## 6. Configuração

Env (nomes vazios): `WHATSAPP_OUTBOUND_ENABLED`, `WHATSAPP_GRAPH_API_VERSION` (`vNN.N`), `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OUTBOUND_WORKER_SECRET`  
Base URL fixa: `https://graph.facebook.com`

## 7. Graph client

`MetaWhatsAppGraphClient` — POST `{base}/{version}/{phoneNumberId}/messages`  
Timeout AbortController; transporte injetável; Bearer; sem logs de token/body/destino.

## 8. Payload

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<external_id da identidade>",
  "type": "text",
  "text": { "preview_url": false, "body": "..." }
}
```

## 9. Classificação

SUCCESS · TRANSIENT_FAILURE · PERMANENT_FAILURE · AMBIGUOUS_DELIVERY  
Códigos: meta_rate_limited, meta_server_error, meta_auth_rejected, meta_invalid_request, meta_invalid_response, meta_timeout_ambiguous, meta_network_error, meta_configuration_error

## 10–12. Claim / lease / retry

SKIP LOCKED; lease 90s; claim_token impede worker stale; backoff 5×2^(n-1) cap 300s; Retry-After; max 8 tentativas; identidade active obrigatória.

## 13. Delivery unknown

Timeout/rede após início → `delivery_unknown`; **não** reenvia automaticamente.

## 14. Worker

`processPendingWhatsAppOutbound` + `POST /api/internal/whatsapp/send`  
Segredo separado; batch conservador; 401/403 abortam batch.

## 15. Status webhook

Normaliza sent/delivered/read/failed; HMAC + channel flag; funciona com outbound OFF; monotônico; sem IA/debounce/budget.

## 16–17. Idempotência / exactly-once

idempotency_key + provider_message_id únicos; claim_token; **não** exactly-once — janela Meta-aceitou / processo-morreu documentada → delivery_unknown.

## 18. Privacidade

Ops events sem PII/token/body/payload. Resposta interna só contagens.

## 19. Testes

| Suite | Resultado |
|-------|-----------|
| `whatsapp-graph-outbound.test.ts` | passed |
| Execution 2 (52) | passed |
| Foundation (32) | passed |
| Targeted WA+chat/crisis/usage/feature/stream/paywall/entitlements | **221 passed** |
| Full vitest | **1548 passed / 17 failed preexisting** |

## 20–21. Baseline / NEW FAILURES

Mesmos 17 testes de copy/UX marketing/início. **NEW FAILURES = 0**

## 22–24. Gates

tsc: sem erros WhatsApp novos · lint touched clean · build green (`/api/internal/whatsapp/send` incluída)

## 25. Arquivos

Criados: migration 021, graph-client, graph-results, outbound-claim, process-outbound, delivery-status, send route, testes, este relatório.  
Modificados: config, outbox status types, ops-log, receive, normalize, webhook route, .env.example.  
Intocado: `repositories/index.ts`, Stripe, preços, entitlements, prompts.

## 26. Diff

Ver `git diff --stat dd5337b..HEAD`

## 27. Pendências

- Credenciais Meta reais + migration remota (humano)
- Cron/agendamento do send worker
- Reconciliação operacional de `delivery_unknown`
- UI de status de vinculação/envio

## 28. Próximo bloco

**Operação Meta staging** — aplicar migrations, configurar secrets, dry-run controlado do sender com flag, reconciliação de delivery_unknown; ainda sem áudio/campanhas/checkout WA.
