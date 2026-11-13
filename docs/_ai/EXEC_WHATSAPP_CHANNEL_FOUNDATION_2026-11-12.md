# EXEC — WhatsApp Channel Foundation (2026-11-12)

Escopo fechado: texto · Meta Cloud API direta · sem áudio · feature flag OFF · sem push/deploy/migration remota.

Base operacional: `docs/_ai/WHATSAPP_FIRST_FULL_AUDIT_2026-10-19.md` (consultado; não reauditorado).

---

## 1. Base Git e branch

| Item | Valor |
|------|-------|
| Worktree | `C:\Users\Giulia\guia-escrituras-funnel-edge` |
| Base | `c67915d` (`origin/main`, Execution A+B) |
| Branch | `cursor/whatsapp-channel-foundation` |
| product-desire | **não modificada** |

## 2. HEAD inicial → final

Inicial: `c67915d`  
Final: `7cbab1e`

## 3. Commits

1. `02f8250` feat(whatsapp): add secure channel foundation and inbound schema  
2. `3ac3f93` feat(whatsapp): add debounce presentation and chat adapter  
3. `b0e29c8` test(whatsapp): cover webhook identity and channel safety  
4. `7cbab1e` docs(whatsapp): document foundation execution

## 4–5. Arquivos

### Criados

- `src/lib/channels/types.ts`
- `src/lib/whatsapp/config.ts`
- `src/lib/whatsapp/crypto.ts`
- `src/lib/whatsapp/normalize.ts`
- `src/lib/whatsapp/debounce.ts`
- `src/lib/whatsapp/identity.ts`
- `src/lib/whatsapp/inbound-events.ts`
- `src/lib/whatsapp/receive.ts`
- `src/lib/whatsapp/format-for-whatsapp.ts`
- `src/lib/whatsapp/outbound.ts`
- `src/lib/whatsapp/process-text-turn.ts`
- `src/lib/whatsapp/ops-log.ts`
- `src/app/api/webhooks/whatsapp/route.ts`
- `supabase/migrations/20261112000019_whatsapp_inbound_events.sql`
- `tests/whatsapp-channel-foundation.test.ts`
- `docs/_ai/EXEC_WHATSAPP_CHANNEL_FOUNDATION_2026-11-12.md`

### Modificados

- `.env.example` (nomes/placeholders WhatsApp apenas)

### Intocados (confirmado)

- `src/lib/database/repositories/index.ts`
- `src/lib/ai/chat-service.ts`
- `src/lib/entitlements/plans.ts`
- Stripe / theology core prompts

## 6. Migration

`20261112000019_whatsapp_inbound_events.sql`

- Tabela `whatsapp_inbound_events`
- `provider_message_id` UNIQUE
- Status: pending | bundled | processing | processed | ignored | failed | pending_identity
- RLS on; revoke anon/authenticated; grant service_role
- Sem payload bruto; texto ≤ 4000
- Índices: status+available_after, sender+status, expires_at
- **Não aplicada remotamente**
- Purge futuro por `expires_at` (TTL default 72h no insert)

## 7. Contrato de canais

`ConversationChannel = "web" | "whatsapp"`  
Policies: `WEB_PRESENTATION_POLICY` / `WHATSAPP_PRESENTATION_POLICY` (brief, 3500 chars, no streaming).

## 8. Webhook

`GET/POST /api/webhooks/whatsapp`

- GET: hub challenge com `safeEqualString` no verify token
- POST desligado → **503** `{ error: "whatsapp_channel_disabled" }` (sem persistir; Meta pode retry; fundação inerte)
- POST ligado: exige APP_SECRET + HMAC

## 9. Assinatura

`x-hub-signature-256` = `sha256=<hex>` via HMAC-SHA256 + `timingSafeEqual`.

## 10. Normalização

Parser puro: só `type=text`; ignora statuses/mídia/desconhecidos; clamp 4000; max 20 msgs/payload.

## 11. Idempotência

Unique `provider_message_id` → duplicate sem reprocessar.

## 12. Debounce

Default **3000 ms** (clamp 2–4s). Bundle por sender; ordem `receivedAt` + id; dedupe; sem timer real (relógio via timestamps).

## 13. pending_identity

`NullChannelIdentityResolver` → status `pending_identity`; **não** chama `runChatTurn`; sem budget/conversa canônica.

## 14. Reuso do motor

`processWhatsAppTextTurn` → `runChatTurn` com cópia de auth `preferredDepth: "brief"` (web default intacto). Persistência canônica permanece no chat-service. Outbound Meta = Noop.

## 15. Presentation

`formatForWhatsApp`: plain text; 1 referência; follow-up; strip markdown/UI; crise **não truncada**.

## 16. Feature flag

`WHATSAPP_CHANNEL_ENABLED` default false; só true/1/yes/on ativa. Credenciais não autoativam.

## 17. Privacidade

`logWhatsAppOps` sem wa_id/telefone/texto/token/payload; correlaciona só prefixos de UUID de evento.

## 18. Testes

`tests/whatsapp-channel-foundation.test.ts` — 32 casos (GET, HMAC, normalize, debounce, identity, formatter, adapter, flag, migration contracts).

## 19. Gates

| Gate | Resultado |
|------|-----------|
| WhatsApp + chat/crisis/usage/feature targeted | **111 passed** |
| Lint touched | **clean** |
| Build | **green** (`/api/webhooks/whatsapp` included) |
| Full vitest | 1460 passed / **17 failed preexisting** (copy contracts marketing/inicio — não tocados por esta wave) |
| tsc --noEmit | erros **preexistentes** em outros testes (seo/sign-up); **nenhum erro whatsapp** após fixes |

## 20. Próximo bloco (não implementar)

1. Identity `user_channel_identities` + OTP  
2. Worker claim de bundles `available_after`  
3. Meta Graph outbound client (ainda flaggado)  
4. Checkout Stripe link para leads WA  

## 21. Serviços externos

Nenhuma chamada Meta/OpenAI/Stripe real nesta execução.

## 22. Diff estatístico

Ver `git diff --stat c67915d..HEAD` pós-commit.

## 23. Riscos encontrados

- Persistência inbound exige admin client; em ambiente sem secret, insert falha graciosamente (ops log) — esperado até env de staging.
- Full suite ainda tem contratos de copy stale (pré-Execution A/B) — fora de escopo.
- Debounce em produção ainda precisa de worker/claim (schema pronto; loop não adicionado — Vercel-safe).
