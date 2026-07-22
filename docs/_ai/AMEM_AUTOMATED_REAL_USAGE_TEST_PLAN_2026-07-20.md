# Amém Chat — Automated Real Usage Test Plan

**Data:** 2026-07-20
**Objetivo:** eliminar dependência de smoke manual do operador para jornadas representativas, sem tocar produção, Stripe live, OpenAI pago ou dados reais.
**Companheiro:** `AMEM_FULL_PRODUCT_ENGINEERING_AUDIT_2026-07-20.md`

---

## 1. Estratégia: sair do smoke manual

Hoje o runbook (`TOMORROW_LAUNCH_RUNBOOK.md`) exige ≤15 passos humanos para Jornadas. A estratégia é uma **pirâmide**:

1. **Contratos estáticos** (já fortes) — manter
2. **Fixtures + memory repos + Vitest de fluxo** — expandir **agora** (seguro)
3. **Integração local Supabase** (opcional, container/`supabase start`) — quando disponível
4. **Playwright local** — **DEFER** (substituído pela decisão em
   `AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md`; **não** instalar agora; harness insuficiente)
5. **RLS live tests** contra DB de **dev** — separado
6. **Smoke financeiro** — **futuro**, mock Stripe apenas; live só com runbook humano explícito

> **Nota histórica (2026-07-20):** a linha abaixo que dizia Playwright “seguro agora”
> está **obsoleta**. A fonte de verdade é o spike DEFER + `pnpm test:real-usage` (Vitest).

**Condição de parada de smoke humano residual:** quando houver harness Playwright
process-scoped **ou** cobertura Vitest real-usage equivalente aos passos do runbook
humano mínimo — **sem** declarar Playwright pronto enquanto o spike permanecer DEFER.

---

## 2. Pirâmide de testes

```
        / E2E Playwright local (poucos, estáveis) \
       /  Integração API route + memory/supabase   \
      /   Unit + contrato + SQL string + theology   \
     /____ Estáticos launch:check / lint / build ____\
```

| Camada | Ferramenta | Quando |
|--------|------------|--------|
| Unit/contrato | Vitest | Agora |
| Theology eval | scripts existentes | Agora (já CI) |
| Fluxo autenticado simulado | Vitest + fixtures | Agora |
| E2E UI | Playwright | **DEFER** — ver spike 2026-07-21; não instalar nesta fase |
| RLS | SQL tests + supabase local | Após confirmação schema |
| Financeiro mock | Vitest Stripe fixtures | Preparação smoke |
| Financeiro live | Manual + checklist | Só após preparação |

---

## 3. Fixtures

Criar sob `tests/fixtures/` (proposta; **não criado nesta auditoria**):

| Fixture | Conteúdo |
|---------|----------|
| `users.ts` | IDs sintéticos por plano |
| `subscriptions.ts` | status active/past_due/canceled |
| `conversations.ts` | threads curtas/longas |
| `journey-progress.ts` | estados mid/complete |
| `stripe-events.ts` | payloads assinados com secret de teste (já parcialmente em testes) |
| `spiritual-profiles.ts` | onboarding on/off |

**Regras:** sem PII real; UUIDs fixos; e-mails `*@amemchat.test`.

---

## 4. Usuários sintéticos por plano

| ID | Plano | Uso |
|----|-------|-----|
| `syn-anon` | — | marketing redirects |
| `syn-essencial` | essencial | paywall jornadas; chat standard |
| `syn-caminho` | caminho | jornadas + chat frequente |
| `syn-profundo` | profundo | deep + jornadas |
| `syn-particular` | particular | sem checkout; entitlements |
| `syn-ended` | canceled | paywall |
| `syn-admin` | + admin_roles | admin surfaces |
| `syn-no-onboarding` | caminho | gate personalização |

Injetar via `getAuthUserContext` mock / memory repos — **nunca** Auth de produção.

---

## 5. Mocks

| Sistema | Mock | Proibido |
|---------|------|----------|
| OpenAI | `MockAiProvider` / harness theology | `OPENAI_API_KEY` real em CI |
| Stripe | constructEvent com whsec de teste; clients stub | sk_live |
| Supabase | memory repositories; opcional local stack | projeto prod |
| Cron | header secret fixture | secret prod |
| Clock | fake timers para expires_at / budgets | — |

`DEMO_MODE` apenas em preview/dev — testes setam env em isolation (`vi.stubEnv`).

---

## 6. Contratos a preservar

- `chatRequestSchema` rejeita userId/role/cost
- Export ignora `x-user-id`
- `safeNextPath`
- Webhook invalid signature → 400
- Journey Essencial → redirect `/jornadas`
- Prefill allow-list sem auto POST
- AppError journeys: `code` machine-readable (AUD-006)
- Theology eval CI gate

---

## 7. E2E local (Playwright) — proposta

**Setup:** `playwright.config.ts` → `webServer: pnpm build && pnpm start` com env de mock; `baseURL=http://127.0.0.1:3000`.

### Suites

#### E2E-A — Anônimo
1. Home carrega brand
2. `/planos` mostra 4 planos; Particular sem cadastro checkout
3. `/inicio` → redirect `/entrar`
4. `/recuperar-senha` render
5. `/rota-inexistente` → not-found
6. Viewport 390×844

#### E2E-B — Essencial (auth mock)
1. Login fixture → `/inicio`
2. Criar conversa (MockAi)
3. Histórico lista
4. Budget near-limit copy (fixture monthly)
5. `/jornadas` preview + CTA comparar
6. Deep link `/jornadas/ansiedade-confianca/...` → redirect catálogo
7. `/conta` + export download JSON schema
8. Cancel dialog acessível

#### E2E-C — Caminho
1. Catálogo 3 cards
2. Start journey → complete step → reload → progresso
3. Segunda “sessão” (novo context storage) → mesmo progresso (memory/db local)
4. Reset isolado
5. Prefill: textarea preenchida; **zero** network `POST /api/chat` até submit

#### E2E-D — Profundo
1. Toggle Aprofundar habilitado
2. Sem entitlement deep em Essencial (cross-check)
3. Uso intenso → burst/budget messaging

#### E2E-E — Particular
1. Sem botões de checkout incompatíveis
2. Jornadas acessíveis se planKey particular

#### E2E-F — Admin
1. Não-admin → `/inicio`
2. Admin: lista usuários, detalhe sem `messages.content`
3. Mobile viewport nav usável
4. Export CSV
5. Ação destrutiva ausente ou confirmada

**Estabilidade:** retries 0 no CI local primeiro; screenshots só on failure; selectors `getByRole`.

---

## 8. Testes de integração (Vitest) — seguros agora

Propostos (criar em bloco B02 do backlog):

| Arquivo proposto | Cobre |
|------------------|-------|
| `tests/real-usage-anonymous-gates.test.ts` | private-paths + proxy redirects (já parcial) |
| `tests/real-usage-journey-entitlement-api.test.ts` | progress APIs 401/403 codes estáveis |
| `tests/real-usage-chat-idempotency-flow.test.ts` | já em chat-reliability — estender multi-tab sim |
| `tests/real-usage-export-journey-progress.test.ts` | schema export + journeyProgress |
| `tests/real-usage-admin-no-message-content.test.ts` | assert admin detail shape |
| `tests/app-error-journey-auth-contract.test.ts` | AUD-006 |

Nenhum destes chama rede paga.

---

## 9. Autorização

Matriz a automatizar:

| Ator | Recurso | Esperado |
|------|---------|----------|
| anon | `/api/chat` | 401 |
| user A | conv B | 404 |
| essencial | progress complete | 403 `journeys_not_entitled` |
| caminho | progress | 200 |
| user | admin export | 403 |
| admin | admin export | 200 |
| sem cron secret | cron | 401 |

---

## 10. RLS (fase seguinte)

Rodar **apenas** em Supabase local ou projeto dev:

1. JWT user tenta `insert messages role=assistant` → falha **após** 004
2. JWT tenta `insert usage_events` → falha após 004
3. JWT `journey_progress` outro `user_id` → fail
4. RPC `complete_journey_progress_step` com `p_user_id` alheio → forbidden

**Antes de 004:** testes documentam comportamento inseguro (expect allow) como regressão de baseline — ou skip com flag `EXPECT_HARDENING=1`.

---

## 11. Jornadas

Cobertura mínima automatizada alinhada ao smoke de 15 passos:

| Passo humano | Automatização |
|--------------|---------------|
| Card início | E2E-C / component test |
| Catálogo 3 | registry unit + E2E |
| Start progress | service memory + API |
| Complete + refresh | memory atomic + E2E reload |
| 2ª sessão | E2E new context |
| Prefill no autosend | E2E route intercept |
| Reset isolado | service test |
| Conta resumo | unit mapper |
| Export journeyProgress | export test |
| Admin counters | admin users test |
| Essencial preview | entitlement + E2E-B |
| Essencial deep link | redirect test |

Theology: manter `eval:theology:journeys`.

---

## 12. Chat simulado

- Sempre `MockAiProvider`
- Cenários: happy, idempotent retry, 429 budget, 409 in-flight, unsafe input, deep denied
- Concorrência: dois `runChatTurn` mesmo requestId
- Histórico longo: memory listRecent truncation

---

## 13. Admin

- Layout redirect
- Metrics functions com admin client mock
- Garantia: serialização detalhe **não** inclui campos `content` de messages
- Mobile: Playwright viewport + nav links visible

---

## 14. Exportação

- Schema `amem-chat-user-data-v1`
- Includes `journeyProgress`
- Excludes secrets / other users
- Content-Disposition filename estável

---

## 15. Pagamentos simulados (futuro — não agora)

Preparar fixtures:

- `checkout.session.completed`
- `customer.subscription.updated` active/canceled/past_due
- Evento duplicado → ACK duplicate
- Signature inválida
- Mode mismatch live/test

**Condições para smoke financeiro real:** checklist humano; valor mínimo; conta de teste; webhook staging; **fora** deste plano de execução imediata.

Comando futuro sugerido (não adicionar agora): `pnpm test:billing:mock`.

---

## 16. Condições de parada

**Parar automação e escalar humano se:**

- Teste exigir `sk_live` / produção Supabase
- Teste enviar OpenAI real
- Flaky &gt;2% em 20 runs
- Assert depender de timing de rede externa
- Qualquer write em projeto linked de produção

**Parar release se E2E-C/B falharem** após existirem no CI.

---

## 17. Comandos propostos

| Comando | Função | Estado |
|---------|--------|--------|
| `pnpm test` | unit atual | existe |
| `pnpm eval:theology:ci` | teologia | existe |
| `pnpm eval:theology:journeys` | jornadas theology | existe |
| `pnpm launch:check` | env matrix | existe |
| `pnpm test:real-usage` | subset Vitest tags | **proposto** |
| `pnpm test:e2e` | Playwright | **proposto** |
| `pnpm test:rls:local` | SQL local | **proposto** |
| `pnpm test:billing:mock` | Stripe fixtures | **proposto futuro** |

Implementação de scripts: só no bloco B02+, não nesta auditoria.

---

## 18. Separação: seguro agora vs financeiro futuro

### Seguro agora (local)
- Vitest com memory/mocks
- Theology evals
- `pnpm test:real-usage` (Vitest stand-in; **não** Playwright)
- Contratos de autorização
- Export schema
- Journey progress memory atomicity

### Playwright
- **DEFER** — ver `AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md`. Não instalar nesta fase.
- Não tratar Playwright como “seguro agora” até harness process-scoped existir.

### Financeiro futuro (após preparação)
- Webhook replay com secret de teste dedicado
- Checkout session create stubbed
- Reconciliação subscription states
- **Live smoke** somente com runbook e aprovação humana

### Explicitamente fora
- Produção
- Dados reais de clientes
- Alterar preços/quotas/webhooks
- Migrations aplicadas por testes

---

## 19. Critério de sucesso da iniciativa

1. Os 15 passos do runbook de Jornadas têm assert automatizado equivalente.
2. CI local `pnpm test && pnpm test:e2e` verde sem rede paga.
3. Operador só executa smoke humano residual: e-mail real, Stripe live, DNS — documentado em Autonomous Operations Runbook V1.

---

*Nenhum teste contra produção, credencial real ou chamada paga foi executado neste plano.*
