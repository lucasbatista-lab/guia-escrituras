# EXEC — WhatsApp Identity + Durable Worker + Outbox (2026-11-12)

Escopo fechado: vinculação autenticada · claim atômico · outbox pendente · sem Graph API · sem UI · sem push/deploy/migration remota.

Parte do HEAD da Execution 1 (`13718b3`). Não reauditora.

---

## 1. Base Git

| Item | Valor |
|------|-------|
| Worktree | `C:\Users\Giulia\guia-escrituras-funnel-edge` |
| Branch | `cursor/whatsapp-channel-foundation` |
| HEAD inicial | `13718b3` |
| product-desire | **não modificada** |

## 2. HEAD inicial / final

Inicial: `13718b3`  
Final: (após commits desta execução — ver seção 3)

## 3. Commits

1. `feat(whatsapp): add secure channel identity linking`
2. `feat(whatsapp): add durable bundle worker and outbox`
3. `test(whatsapp): cover identity worker and delivery safety`
4. `docs(whatsapp): document identity worker execution`

Sem push. Sem PR. Sem deploy.

## 4. Migration 020

`supabase/migrations/20261112000020_whatsapp_identity_worker_outbox.sql`

**Não aplicada remotamente.**

## 5. Schema criado / alterado

### Criadas

- `user_channel_identities` — RLS on; service_role only; 1 WhatsApp ativo por user; 1 external ativo global; verification `authenticated_link_code`
- `channel_identity_link_tokens` — hash only; TTL 10m; max 5 attempts; invalidate previous
- `whatsapp_outbound_messages` — idempotency_key UNIQUE; status pending→…; sem Graph

### Alteradas

- `whatsapp_inbound_events` — `bundle_id`, `claimed_at`, `locked_until`, `processing_started_at`, `completed_at`, `next_attempt_at`; status `retry`

### RPCs (SECURITY DEFINER, search_path=public, service_role only)

- `whatsapp_consume_link_token`
- `whatsapp_claim_inbound_bundle` (SKIP LOCKED)
- `whatsapp_complete_inbound_bundle`
- `whatsapp_retry_inbound_bundle`
- `whatsapp_release_expired_inbound_leases`

## 6. Fluxo de vinculação

1. Usuário autenticado no site → `POST /api/account/channels/whatsapp`
2. Backend gera `ABCD-EFGH` (crypto); persiste só HMAC(`WHATSAPP_LINK_TOKEN_SECRET`)
3. Plaintext retornado **uma vez**
4. Usuário envia no WA: `VINCULAR <CÓDIGO>`
5. Worker detecta comando estrito → consume atômico → cria identidade active
6. Outbox de confirmação fixa (sem IA)

## 7. Segurança dos códigos

- Sem Math.random; alfabeto sem 0/O/1/I/L
- Segredo ≥32 chars; fail-closed
- Não reutiliza `WHATSAPP_APP_SECRET`
- Single-use; expiração 10 min; max 5 tentativas
- Código anterior invalidado
- Código nunca em logs/erros/analytics

## 8. APIs autenticadas

`/api/account/channels/whatsapp`

| Método | Comportamento |
|--------|----------------|
| GET | `linked`, `status`, `verifiedAt`, `pendingCodeExpiresAt` — sem external_id/código |
| POST | Gera código; Cache-Control no-store; same-origin; rate limit; auth obrigatória |
| DELETE | Revoga identidade; cancela outbox pending; idempotente |

userId só da sessão.

## 9. Resolução de identidade

`SupabaseChannelIdentityResolver` consulta somente `status=active`.  
Revoked → null. Não cria usuário. Sem fallback telefone/e-mail. Fake só em testes.

## 10. Claim atômico

`whatsapp_claim_inbound_bundle` + `FOR UPDATE SKIP LOCKED`.  
Lease default **90s**. Ordenação por `received_at`. Um sender por claim. Limite conservador por invocação.

## 11. Lease e retry

- Lease expirada → `whatsapp_release_expired_inbound_leases` → `retry`
- Backoff determinístico: 5×2^(n-1) capped 300s
- Max tentativas: 8 → `failed`
- Transitório → retry; definitivo → failed; `access_required` → processed (sem loop)

## 12. Worker

`processAvailableWhatsAppBundles` + `POST /api/internal/whatsapp/process`

- Segredo `WHATSAPP_WORKER_SECRET` (constant-time; header/Bearer; sem query)
- Feature flag obrigatória
- Sem cron / sem vercel.json schedule neste bloco

## 13. Outbox

`whatsapp_outbound_messages` status inicial `pending`.  
`idempotency_key = bundle:<bundleId>`.  
Inbound só conclui após outbox persistida (ou duplicate).  
Noop outbound **não** marca `sent`. Nenhuma chamada Meta.

## 14. Access required

Sem plan / sem `chat_standard` → outcome `access_required`; sem IA; sem retry infinito; sem entitlement novo; sem oferta comercial na outbox.

## 15. Privacidade

Ops events: identity_link_code_created, identity_linked, identity_link_conflict, identity_revoked, bundle_claimed/completed/retried/failed, outbox_created, access_required.  
Sem wa_id, telefone, código, texto, hash, payload, e-mail.

## 16. Testes

| Suite | Resultado |
|-------|-----------|
| `tests/whatsapp-identity-worker.test.ts` | **52 passed** |
| `tests/whatsapp-channel-foundation.test.ts` | **32 passed** (regressão Exec 1) |
| Targeted (WA + chat/crisis/usage/feature/stream/paywall) | **181 passed** |
| Full vitest | **1512 passed / 17 failed preexisting** |

## 17. Baseline preexistente (17)

Identidade estável (mesmas falhas de copy/UX marketing/início/chat affordances):

1. `activation-session-checklist` — wires checklist on empty inicio…
2. `aprofundar-v3-affordance` — explains deepened reply…
3. `auth-confirm-resume` — dedicated check-email experience…
4. `authenticated-ux-polish` — chat UI hides technical fields…
5. `conversation-history-retention` — page wires search…
6. `conversation-resume` — inicio shows age-based resume copy…
7. `conversation-resume` — conversas highlights latest…
8. `deep-response-on-demand` — chat panel exposes deepen control…
9. `free-product-closeout` — signup without plan is a free path…
10. `organic-share` — home final CTA has share…
11. `plan-differentiation-upsell` — home links to full plan comparison…
12. `purchase-experience` — conversion section order
13. `purchase-experience` — CTAs and short hero transparency
14. `purchase-experience` — focus/aria-live
15. `real-usage-e2e-critical-flows` — journey step completion UX…
16. `retention-continuity-v2` — inicio resume uses age-based return copy…
17. `sprint2-polish-ops` — home planos copy names journeys…

## 18. New failures

**NEW FAILURES = 0** (mesmo conjunto de 17 por identidade de teste).

## 19. TypeScript

- Build `next build` TypeScript: **green**
- `tsc --noEmit`: erros **preexistentes** em testes fora de escopo (seo/signup/preferDeep/NODE_ENV/etc.)
- **Nenhum erro WhatsApp** nos módulos de produção após correção do teste (`s` flag)

## 20. Lint

Touched WhatsApp paths: **clean** (`--max-warnings 0`)

## 21. Build

**green** — rotas incluídas:

- `/api/account/channels/whatsapp`
- `/api/internal/whatsapp/process`
- `/api/webhooks/whatsapp`

## 22. Arquivos

### Criados

- `supabase/migrations/20261112000020_whatsapp_identity_worker_outbox.sql`
- `src/lib/whatsapp/link-tokens.ts`
- `src/lib/whatsapp/link-rate-limit.ts`
- `src/lib/whatsapp/claim.ts`
- `src/lib/whatsapp/outbox.ts`
- `src/lib/whatsapp/process-bundles.ts`
- `src/lib/whatsapp/auth-for-user.ts`
- `src/app/api/account/channels/whatsapp/route.ts`
- `src/app/api/internal/whatsapp/process/route.ts`
- `tests/whatsapp-identity-worker.test.ts`
- `docs/_ai/EXEC_WHATSAPP_IDENTITY_WORKER_2026-11-12.md`

### Modificados

- `src/lib/whatsapp/identity.ts`
- `src/lib/whatsapp/config.ts`
- `src/lib/whatsapp/ops-log.ts`
- `src/lib/whatsapp/receive.ts` (inbound sempre `pending`; identidade no worker)
- `src/lib/whatsapp/inbound-events.ts` (`retry` status)
- `.env.example` (nomes dos novos secrets)

### Intocados (confirmado)

- `src/lib/database/repositories/index.ts`
- `src/lib/entitlements/plans.ts`
- Stripe / preços / prompts teológicos centrais

## 23. Diff estatístico

Ver `git diff --stat 13718b3..HEAD` pós-commit.

## 24. Pendências

- Aplicar migration 020 em staging (humano)
- Configurar `WHATSAPP_LINK_TOKEN_SECRET` / `WHATSAPP_WORKER_SECRET`
- UI de configurações de vinculação
- Sender Graph API (próximo bloco)
- Cron/agendamento do worker

## 25. Próximo bloco recomendado

**WhatsApp Graph outbound sender** — claim de outbox `pending`, envio Meta Cloud API com retry/idempotência, marcação `sent`/`failed`, ainda atrás de feature flag; sem áudio; sem checkout WA.
