# Amém Chat — Full Product Engineering Audit

**Data:** 2026-07-20  
**Escopo:** investigação, riscos, plano de testes e backlog — **sem** correções de produto  
**Auditor:** análise estática + gates automatizados locais + inspeção de código/migrations/docs  
**Restrições observadas:** sem migrations, rollback, deploy, alterações remotas, Stripe/billing, chamadas pagas, exposição de segredos

---

## 1. Resumo executivo

O repositório em `main` (`6be18de`) está **um commit de documentação à frente** do SHA de feature Jornadas `7113493`. Gates locais desta auditoria passaram: theology journeys/ci, `launch:check`, lint (5 warnings), **739** testes, build. Working tree limpa exceto ruído CRLF em `src/lib/database/repositories/index.ts` (não commitável).

**Prontidão:** o produto é coerente em código e testes unitários/contratuais, mas **não está operacionalmente fechado** para uso real sem dependência de smoke humano: (a) smoke autenticado de Jornadas ainda pendente por docs; (b) `docs/DATABASE.md` desatualizado vs runbooks que afirmam 008 aplicada; (c) migration **004** permanece deliberadamente fora do cutover, deixando políticas RLS pré-hardening exploráveis por cliente autenticado (forge de `usage_events` / insert de `messages` sem restrição de `role`); (d) fluxo seguro de crise referenciado em teologia **não implementado** no chat; (e) ausência de E2E local automatizado para jornadas de uso real.

**Não há evidência nesta auditoria de P0 confirmado de vazamento cross-user no app layer** (chat/export/admin filtram por sessão). O risco mais grave confirmável por schema+docs é **integridade pré-004 (P1)** e **segurança pastoral/crise (P1)**, não cobrança incorreta Stripe no código inspecionado.

---

## 2. Estado real do repositório

| Item | Valor |
|------|--------|
| Branch | `main` |
| HEAD local | `6be18deff1a3e9cc2d731dc65fe34beaa1a75b54` — `docs: add launch resumption runbook` |
| `origin/main` | Idêntico a HEAD (up to date) |
| Status | 1 arquivo modificado não staged: `src/lib/database/repositories/index.ts` (ruído CRLF; `--ignore-cr-at-eol` sem diff semântico) |
| `7113493` | `feat: add guided reading journeys` — **ancestral** de HEAD; **não** é o tip atual |
| Divergência vs “último estado funcional publicado” | Tip publicado no remote = `6be18de` (docs). Feature funcional de produto = `7113493`. Runbook de amanhã já previa “7113493 (+ commit de docs)”. |
| Estrutura | Next.js App Router (`src/app`), `src/lib/*`, `src/components/*`, `supabase/migrations` + `postchecks`, `tests/*`, `docs/*`, `scripts/*` |
| Package manager | pnpm; scripts: `dev`, `build`, `start`, `lint`, `test`, `launch:check`, `eval:theology*`, `eval:theology:journeys` |
| Testes | Vitest (`vitest.config.ts`), `tests/**/*.test.ts`, alias `server-only` mockado |
| Migrations (ordem) | `001` foundation → `002` seed → `003` daily report fn → `004` hardening → `005` signup_intents → `006` stripe billing → `007` legal_consents → `008` journey_progress |
| Docs técnicas | `ARCHITECTURE`, `DATABASE`, `DEPLOYMENT`, `COMMERCIAL_PLANS`, `READING_JOURNEYS*`, `AI_AND_THEOLOGY`, runbooks de launch/cutover, etc. |

### Variáveis de ambiente referenciadas (nomes apenas)

Públicas: `NEXT_PUBLIC_APP_*`, `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_LEGAL_*`, `NEXT_PUBLIC_TERMS_VERSION`, `NEXT_PUBLIC_PRIVACY_VERSION`, `NEXT_PUBLIC_INSTAGRAM_HANDLE`, `NEXT_PUBLIC_GIT_COMMIT`  

Server: `APP_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_*`, `CHAT_RATE_LIMIT_*`, `CHAT_TURN_IN_FLIGHT_MS`, `STRIPE_*`, `CRON_SECRET`, `DEMO_MODE`, `USD_BRL_PLANNING_RATE`, `CONVERSATION_MEMORY_MAX_CHARS`, `VERCEL_*`, `NODE_ENV`, `THEOLOGY_EVAL_CLI`

`DEMO_MODE` é **proibido** em production (`launch:check`).

### Integrações externas

| Integração | Uso |
|------------|-----|
| Supabase Auth + Postgres | Sessão cookies SSR, RLS, RPCs |
| OpenAI Responses API | Chat (server-only); MockAiProvider só com mocks |
| Stripe | Checkout, portal, webhook |
| Vercel | Hosting, cron `/api/cron/daily-report` |
| WhatsApp | Apenas `wa.me` share orgânico + entitlement `whatsapp_access` (Particular); **sem** chat pastoral |

### Camadas de autorização

1. `src/proxy.ts` → `updateSession` (HTML gates para platform/admin; APIs sem redirect de login)  
2. Layouts: `(platform)/layout.tsx`, `admin/layout.tsx` (`isAdmin`)  
3. Handlers: `requireAuthUser` / `requireAdminUser` / `assertAdminServiceAccess` / `assertCronAuthorized`  
4. RLS + RPCs no Postgres  
5. Entitlements em `src/lib/entitlements/*` (planKey efetivo da assinatura)

---

## 3. Arquitetura (visão)

```
Browser → proxy (www→apex, session, acquisition cookies)
       → RSC pages / Client islands
       → Route Handlers + Server Actions
       → Repositories (Supabase | Memory se mocks)
       → OpenAI | Stripe | Cron
Postgres ← RLS (user) + service role (writes confiáveis: assistant, usage, webhook)
```

Sem plano gratuito: chat exige assinatura ativa + onboarding. Admin via `admin_roles`, nunca campo em `profiles`.

---

## 4. Inventário de superfícies

### 4.1 Páginas (37 `page.tsx` + especiais)

**Marketing (público):** `/`, `/planos`, `/como-funciona`, `/uso-justo`, `/cancelamento`, `/privacidade`, `/termos`, `/transparencia-ia`, `/mensagens-personalizadas`

**Auth:** `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/confira-seu-email`, `/email-confirmado`, `/onboarding`

**Platform (privada HTML):** `/inicio`, `/conversar`, `/conversas`, `/conta`, `/personalizar`, `/assinar/continuar`, `/assinatura/sucesso`, `/assinatura/cancelada`, `/jornadas`, `/jornadas/[slug]`, `/jornadas/[slug]/[step]`, `/jornada` (redirect)

**Admin:** `/admin`, `/admin/usuarios`, `/admin/usuarios/[userId]`, `/admin/aquisicao`, `/admin/eventos`, `/admin/uso`, `/admin/custos`, `/admin/parceiros`, `/admin/relatorios`

**Especiais:** `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/twitter-image`, `/icon`, `not-found`

**Auth callbacks:** `/auth/callback`, `/auth/confirm`

### 4.2 APIs (21)

| Rota | Auth |
|------|------|
| `POST /api/chat` | Sessão |
| `GET /api/usage` | Sessão |
| `GET /api/account/export` | Sessão (ignora userId cliente) |
| `POST /api/account/plan-interest` | Sessão |
| `GET/POST /api/journeys/progress*` | Sessão + entitlement |
| `POST /api/journeys/events` | Sessão (beacons) |
| `POST /api/billing/portal` | Sessão |
| `GET /api/billing/checkout-success` | Sessão/cookie checkout |
| `POST /api/webhooks/stripe` | Assinatura Stripe |
| `GET /api/health`, `/api/health/db` | Público (sem secrets) |
| `GET/POST /api/cron/daily-report` | `CRON_SECRET` |
| `GET /api/reports/daily` | Admin |
| `POST /api/admin/reports/generate` | Admin |
| `GET /api/admin/usuarios/export` | Admin |
| `GET /api/admin/stripe/readiness` | Admin |

### 4.3 Server Actions (`"use server"`)

`checkout-action`, `subscription-actions`, `login-action`, `sign-up-action`, `password-reset-action`, `update-password-action`, `plan-continuation-action`, `resend-confirmation-action`

### 4.4 Contagens desta auditoria

| Tipo | Qtd |
|------|-----|
| Páginas `page.tsx` | 37 |
| Route handlers `route.ts` | 21 (+ proxy) |
| Tabelas previstas (001+005–008) | 25 |
| Fluxos mapeados (seção 5) | 24 |
| Achados classificados | 32 |

---

## 5. Mapa de fluxos (rastreável)

Legenda severidade de risco residual do fluxo (não do achado): R = residual.

### F01 — Home e marketing institucional
- **Entrada:** `/`
- **Componentes:** `site-chrome`, `ChatDemo`, `PlanCards`, `ShareInvite`
- **Auth:** anônimo
- **Estados:** estático; demo client-side
- **Erros:** N/A
- **Testes:** `launch-conversion`, `seo-social`, `brand`, `organic-share`
- **Lacunas:** E2E visual mobile
- **Risco:** P3

### F02 — Planos / pricing
- **Entrada:** `/planos`
- **Interno:** `PLAN_DEFINITIONS`, FAQ, beacons de conversão
- **Auth:** público; Particular = request access
- **Testes:** `purchase-experience`, `plan-differentiation-upsell`, `plan-promises-checkout-guard`
- **Risco:** P2 (promessas vs entitlements reservados)

### F03 — Tentativa rota privada anônima
- **Entrada:** `/inicio`, `/conversar`, `/admin`, …
- **Gate:** cookie ausente → 307 `/entrar?next=` via `safeNextPath`
- **Testes:** `edge-redirects-acquisition`, `user-journey-paywall`
- **Risco:** P3 (APIs retornam JSON 401 — correto)

### F04 — Login / logout / sessão
- **Entrada:** `/entrar` → `login-action` → Supabase Auth cookies
- **Continuidade:** `proxy` `getUser` + layouts
- **Testes:** `sign-up`, `auth-confirm-resume`
- **Lacunas:** E2E cookie/session multi-tab
- **Risco:** P2

### F05 — Cadastro + intents + e-mail
- **Entrada:** `/cadastro` (+ plan query)
- **Tabelas:** `signup_intents`, `legal_consents`, Auth users
- **Testes:** `signup-intents`, `legal-consent`, `sign-up`
- **Risco:** P1 se 005/007 ausentes em prod (docs ambíguas)

### F06 — Recuperação de senha
- **Entrada:** `/recuperar-senha` → `/redefinir-senha`
- **Testes:** `password-recovery`
- **Risco:** P2 (enumeração mitigada parcialmente por copy genérica — validar)

### F07 — Onboarding espiritual
- **Entrada:** `/onboarding`, `/personalizar`
- **Tabelas:** `spiritual_profiles` (upsert client + RLS)
- **Gate chat:** `onboarding_completed`
- **Testes:** `first-use-onboarding`
- **Risco:** P2 (`preferred_depth` writable sem revalidar plano no write)

### F08 — Painel `/inicio`
- **Entrada:** autenticado + assinatura
- **Componentes:** cards chat/jornadas/conta
- **Testes:** `authenticated-ux-polish`
- **Risco:** P3

### F09 — Criação e continuidade de conversa
- **Entrada:** `/conversar` → `POST /api/chat`
- **Tabelas:** `conversations`, `messages`, `conversation_summaries`, `usage_*`
- **Auth:** sessão + planKey + entitlements + budgets + rate limits
- **Estados:** loading, idempotent retry, 402/403/429/503
- **Testes:** `chat-reliability`, `chat-schema`, `chat-turn-context`, `conversation-resume`, `conversation-memory`
- **Lacunas:** lock só process-local; crise não implementada
- **Risco:** P1 (crise + pré-004 integrity)

### F10 — Histórico `/conversas`
- **Entrada:** lista → `/conversar?c=`
- **Ownership:** queries por `user_id`
- **Testes:** `conversation-resume`
- **Lacunas:** paginação de listas muito longas / E2E
- **Risco:** P2

### F11 — Limites / entitlements / upsell ético
- **Entrada:** budgets no chat; UI upsells
- **Testes:** `entitlements`, `usage-budget`, `plan-differentiation-upsell`, `deep-response-on-demand`
- **Risco:** P2

### F12 — Jornadas catálogo + preview Essencial
- **Entrada:** `/jornadas`
- **Entitlement:** `canUseReadingJourneys`
- **Testes:** `reading-journeys-mvp`, `user-journey-paywall`
- **Risco:** P1 até smoke autenticado

### F13 — Jornada etapa / complete / persistência
- **Entrada:** `/jornadas/[slug]/[step]` + APIs progress
- **DB:** `journey_progress` + RPCs
- **Estados:** start, complete, reset, refresh
- **Testes:** `journey-progress-persistence` (SQL/string + memory), theology journeys eval
- **Lacunas:** integração real Supabase automatizada; smoke humano pendente
- **Risco:** P1

### F14 — Prefill chat sem auto-send
- **Entrada:** CTA jornada → `/conversar?jornada=&etapa=`
- **Regra:** allow-list; sem POST automático
- **Testes:** cobertura em `reading-journeys-mvp`
- **Risco:** P2 (custo OpenAI se regressão)

### F15 — Conta + cancelamento + portal
- **Entrada:** `/conta`, subscription actions, `/api/billing/portal`
- **Testes:** `native-subscription`, `purchase-experience`
- **Risco:** P1 (billing) — código hardened; smoke financeiro futuro

### F16 — Exportação LGPD
- **Entrada:** `GET /api/account/export`
- **Inclui:** conversas, mensagens próprias, `journeyProgress`
- **Testes:** `account-data-export`
- **Risco:** P1 se IDOR (mitigado: sessão only)

### F17 — Particular (request access)
- **Entrada:** planos / cadastro bloqueia checkout
- **Stripe:** rejeita `particular`
- **Testes:** `launch-funnel`, `stripe-billing`
- **Risco:** P2 (provisionamento manual ops)

### F18 — Admin visão / usuários / métricas
- **Entrada:** `/admin*`
- **Auth:** `admin_roles` + `requireAdminUser`
- **Dados:** agregados; **sem** conteúdo de conversa
- **Testes:** `admin-*` suite
- **Risco:** P2 mobile ops; P1 se DEMO_MODE em preview mal configurado

### F19 — Aquisição / UTMs / share
- **Entrada:** proxy cookies + `/admin/aquisicao`
- **Testes:** `acquisition-tracking`, `edge-redirects-acquisition`, `referrals`
- **Risco:** P3

### F20 — Checkout Stripe
- **Entrada:** server action checkout
- **Testes:** `checkout-*`, `stripe-*` (mocks)
- **Risco:** P1 — smoke financeiro futuro obrigatório

### F21 — Webhook Stripe
- **Entrada:** `POST /api/webhooks/stripe`
- **Controles:** signature, mode match, lease/idempotency
- **Testes:** `stripe-webhook-hardening`
- **Risco:** P1 se `payment_events` (006) ausente

### F22 — Cron daily report
- **Auth:** `CRON_SECRET` timing-safe
- **Testes:** `launch-operations-reporting`
- **Risco:** P2

### F23 — Saúde
- `/api/health`, `/api/health/db` — sem expor secrets
- **Risco:** P3

### F24 — 404 / páginas inexistentes
- `not-found.tsx` — a11y touch target fraco
- **Risco:** P3

---

## 6. Matriz de segurança

| Área | Postura | Evidência | Severidade residual |
|------|---------|-----------|---------------------|
| Auth cookies SSR | Boa | `@supabase/ssr`, SameSite=lax, secure prod | P3 |
| Open redirect | Boa | `safeNextPath` | P3 |
| Admin HTML | Boa | layout `isAdmin` | P2 (proxy só checa sessão) |
| Admin API | Boa | `requireAdminUser` | P3 |
| Chat IDOR | Boa (app) | `getByIdForUser` | P3 |
| Export IDOR | Boa | ignora userId cliente | P3 |
| Pre-004 RLS messages/usage | **Fraca** | `001` policies; `004` não aplicada por docs | **P1** |
| Journey RPC via service role | OK se callers session-bound | APIs passam `auth.userId` | P2 |
| Webhook | Forte | constructEvent + lease | P3 |
| Cron | Forte | timingSafeEqual | P3 |
| CSP | Média | `script-src 'unsafe-inline'` | P2 |
| Prompt injection | Fraca | 2 regexes | P2 |
| Crisis flow | Ausente | docs + eval harness | **P1** |
| Secrets em logs | Boa | maskUserId; health sem secrets | P3 |
| Mass assignment chat | Boa | Zod schema | P3 |
| AppError journeys | Bug contrato | `api-auth.ts` args invertidos | P2 |
| Demo admin | Preview only | `allowsMocks` + isAdmin | P2 |
| Dependências | Não auditado com `pnpm audit` nesta etapa | — | Lacuna |

**Não executada:** exploração destrutiva, fuzz remoto, pen-test pago.

---

## 7. Banco de dados e integridade

### Tabelas (por migration)

**001:** profiles, traditions, tradition_policies, personas, persona_policies, spiritual_profiles, plans, plan_entitlements, subscriptions, conversations, messages, conversation_summaries, usage_events, usage_monthly, referral_codes, referral_attributions, referral_rewards, custom_content_orders, daily_reports, admin_roles  

**005–008:** signup_intents, billing_customers, payment_events, legal_consents, journey_progress  

### Estado documental (inconsistente)

| Fonte | 001–003 | 004 | 005–007 | 008 |
|-------|---------|-----|---------|-----|
| `DATABASE.md` | aplicadas | não | “conforme runbook” | **não aplicar** (desatualizado) |
| Cutover/DEPLOYMENT | aplicadas | **não aplicar** | silêncio | silêncio |
| END_OF_DAY / TOMORROW / NEXT_STEPS | — | pós-lançamento | implícito (billing live) | **aplicada** |

**Conclusão operacional:** tratar **008 como aplicada** (human-confirmed em docs de 2026-07-20) e **004 como não aplicada**. Status real de 005–007 **não verificável** nesta auditoria (sem inspeção remota) — **lacuna P1 operacional**.

### Riscos de schema

1. Sem 004: insert autenticado em `usage_events`; `messages` sem check de `role='user'` nem ownership de conversation; summaries writable; sem unique `(user_id, request_id)` no DB.  
2. Com código atual: assistant/usage usam `createAdminClient()` — mitiga escrita normal, **não** impede cliente malicioso com JWT.  
3. Race chat: lock in-process; cross-instance depende de unique indexes da 004.  
4. Journey: RPCs atômicos bem desenhados; sem DELETE client.  
5. Cascades: `profiles` → dependentes ON DELETE CASCADE (padrão).  

**Propostas futuras de migration (somente registro — não aplicar):**  
- Aplicar `004` após revisão e postcheck.  
- Atualizar `DATABASE.md` para refletir 005–008.  
- Índices/admin scale se CSV Auth lookups crescerem.

---

## 8. Chat, histórico e IA

| Tema | Achado |
|------|--------|
| Fluxo | Gates → idempotência requestId → lock → budgets → persist user → AI → persist assistant (secret) → usage |
| Memória | Summary + recent messages; `CONVERSATION_MEMORY_MAX_CHARS` |
| Retry | Client requestId; 409 turn_in_progress; Retry-After |
| Teologia | `GENERAL_THEOLOGY_RULES`, evals offline; **não** apresentar como Jesus/Deus |
| Crise | Referenciada; **não implementada** no path de chat |
| Custo | budgets mensais/plan; rate limits |
| Vazamento | ownership checks |
| Streaming | não implementado |
| A11y chat | aria-live ruidoso; Enter-to-send mobile |
| Mobile | ChatPanel client island |

---

## 9. IA e teologia

- Evals: `pnpm eval:theology:ci` e `:journeys` — **PASS** nesta auditoria.  
- Jailbreak: detectores em eval + regex fraca em runtime.  
- Grounding bíblico: curated provider + validação de output.  
- Risco pastoral: ausência de crisis routing = **P1** se usuários em sofrimento usarem o chat como suporte.

---

## 10. Pagamentos e planos

| Plano | Preço | Checkout | Jornadas | Deep |
|-------|-------|----------|----------|------|
| Essencial | R$38 | Stripe | Não | Não |
| Caminho | R$58 | Stripe | Sim | Não |
| Profundo | R$188 | Stripe | Sim | Sim |
| Particular | R$988 | Request only | Se provisionado | Se provisionado |

Webhook: signature + mode + claim lease; eventos subscription/checkout/invoice.  
**Fora de escopo atual:** plan change, proration.  
**Smoke financeiro:** apenas planejado (ver test plan) — **não** executar agora.

---

## 11. UX / UI / mobile / a11y

Achados concretos (não redesenho):

| ID ref | Evidência |
|--------|-----------|
| Menus sem focus trap | `site-chrome.tsx`, `platform-nav.tsx` |
| Dialog cancel sem focus trap | `subscription-management-panel.tsx` |
| Skip link falha em legal | `legal-document-shell.tsx` sem `#conteudo-principal` |
| Touch targets fracos | footer marketing, auth brand, conta mailto, `not-found`, demo chips |
| Admin denso no mobile | `admin/layout.tsx` nav wrap; tabelas `min-w` |
| Chat SR noise | `chat-panel.tsx` aria-live |
| Positivos | skip link root, `lang=pt-BR`, muitos `min-h-11`, admin sem conteúdo de conversa |

---

## 12. Performance e confiabilidade

- Platform + admin: `force-dynamic` amplo (correto para auth; custo de cache).  
- Client islands: ChatPanel, demos, forms — páginas RSC.  
- Sem `next/image` no produto.  
- 3 fontes Google no root layout.  
- `loading.tsx` só root/platform/admin-usuarios; um único `error.tsx`.  
- Observabilidade: logger JSON; chat errors no throw path; 401/400 early sem log; sem client telemetry.  
- Health: `/api/health`, `/api/health/db`.  
- Sem circuit breaker formal além de erros OpenAI → 503.

---

## 13. Admin e operação

Operável no desktop; **mobile parcial** (nav wrap + tabelas scroll). Sem help center. Aquisição em `/admin/aquisicao`. Alertas via métricas agregadas. Sem trilha de auditoria de ações destrutivas além de logs pontuais.

**Admin Mobile Operations V1 (mínimo proposto — não implementar agora):**

1. Nav colapsável / bottom sheet com 4 entradas: Visão, Usuários, Eventos, Relatórios  
2. Cards KPI thumb-friendly em `/admin`  
3. Lista usuários com busca + filtros já existentes, row height ≥44px  
4. Detalhe usuário stacked (sem tabelas largas)  
5. CTA “Gerar relatório” e readiness Stripe com feedback claro  
6. Banner “sem conteúdo de conversas” persistente  
7. Empty/error states explícitos  

---

## 14. Observabilidade

| Presente | Ausente |
|----------|---------|
| Logger estruturado | Correlação end-to-end UI→API além de requestId |
| Cron/admin report logs | Persistência de falhas HTTP chat (docs: exigiria migration) |
| Health version SHA | Dashboards externos / alerting automatizado |
| Mask user id | Client-side error reporting |

---

## 15. Testes (resultado dos gates)

| Gate | Resultado |
|------|-----------|
| `pnpm eval:theology:journeys` | PASS (1 file / 1 test) |
| `pnpm eval:theology:ci` | PASS |
| `pnpm launch:check` | PASS (static env matrix) |
| `pnpm lint` | PASS com **5 warnings** (eslint-disable unused em theology eval) |
| `pnpm test` | PASS **63 files / 739 tests** |
| `pnpm build` | PASS (Next 16.2.10); rotas listadas OK |

**Qualidade da suíte:** forte em contratos Stripe/auth/chat unitários; fraca em E2E real, RLS live, multi-instance, crise, e regressão visual mobile. Muitos testes leem source strings (úteis anti-regressão, mas não executam comportamento I/O).

---

## 16. Achados priorizados

### AUD-001 — RLS pré-004 permite forge de usage e mensagens não-user
- **Domínio:** segurança / DB  
- **Descrição:** Policies de `001` permitem insert autenticado em `usage_events` e `messages` sem restringir `role` nem ownership de conversation; `004` remove isso mas docs dizem não aplicada.  
- **Evidência:** `20260712000001_foundation_schema.sql` policies; `PRODUCTION_CUTOVER_RUNBOOK.md` §A.9; `ARCHITECTURE.md` “004 ainda não aplicada”.  
- **Arquivos:** migrations 001/004; `createAdminClient` usage  
- **Fluxo:** F09, F11  
- **Impacto:** adulteração de histórico próprio / orçamento / custos internos  
- **Probabilidade:** média (requer JWT válido + conhecimento)  
- **Severidade:** **P1**  
- **Regressão:** média ao aplicar 004  
- **Correção:** aplicar 004 com postcheck + testes RLS  
- **Migration:** sim  
- **Pagamento:** não diretamente  
- **Validação humana:** sim  
- **Tamanho:** M

### AUD-002 — Fluxo seguro de crise não implementado no chat
- **Domínio:** IA / teologia / segurança pastoral  
- **Evidência:** `docs/AI_AND_THEOLOGY.md`; eval report “não implementado”; ausência no `chat-service`  
- **Severidade:** **P1**  
- **Tamanho:** L  
- **Migration:** não  
- **Pagamento:** não  
- **Validação humana:** sim (pastoral)

### AUD-003 — Documentação de migrations divergente (DATABASE.md vs runbooks)
- **Domínio:** operações / DB  
- **Evidência:** `DATABASE.md` vs `END_OF_DAY_MASTER_REPORT` / `TOMORROW_LAUNCH_RUNBOOK`  
- **Severidade:** **P1** (risco de operador reaplicar/omitir errado)  
- **Tamanho:** S  
- **Migration:** não (só docs) — mas pode induzir migration errada

### AUD-004 — Status remoto de 005–007 não confirmável
- **Domínio:** operações  
- **Descrição:** Billing/legal/intents hard-dependem dessas tabelas; cutover docs não as listam como aplicadas.  
- **Severidade:** **P1** (lacuna de informação; se ausentes = outage billing)  
- **Tamanho:** S (verificação humana read-only)  
- **Pagamento:** sim (verificação)

### AUD-005 — Smoke autenticado de Jornadas pendente
- **Domínio:** produto / jornadas  
- **Evidência:** `TOMORROW_LAUNCH_RUNBOOK.md`, `END_OF_DAY_MASTER_REPORT`  
- **Severidade:** **P1** operacional (feature publicada sem smoke)  
- **Tamanho:** S (execução humana) — automatizar depois (test plan)

### AUD-006 — AppError invertido em `journeys/api-auth.ts`
- **Domínio:** API / UX  
- **Evidência:** ctor `(message, code, status, safeMessage)` vs calls passando code humano no 2º arg  
- **Severidade:** **P2**  
- **Tamanho:** XS  
- **Testes:** contrato JSON 401/403

### AUD-007 — Prompt injection mitigação mínima
- **Domínio:** segurança IA  
- **Evidência:** `src/lib/safety/input.ts` 2 regexes  
- **Severidade:** **P2**  
- **Tamanho:** M

### AUD-008 — CSP `unsafe-inline` em scripts
- **Domínio:** XSS residual  
- **Evidência:** `next.config.ts`  
- **Severidade:** **P2**  
- **Tamanho:** M

### AUD-009 — Chat lock só process-local
- **Domínio:** confiabilidade  
- **Evidência:** `chat-service` + comments; unique index depende 004  
- **Severidade:** **P2**  
- **Tamanho:** M (+004)

### AUD-010 — Admin não otimizado para operação mobile
- **Domínio:** admin / UX  
- **Evidência:** `admin/layout.tsx`, tabelas admin  
- **Severidade:** **P2**  
- **Tamanho:** M (Admin Mobile Ops V1)

### AUD-011 — Ausência de E2E automatizado de uso real
- **Domínio:** qualidade  
- **Severidade:** **P2**  
- **Tamanho:** L

### AUD-012 — Skip-to-content quebrado em páginas legais
- **Domínio:** a11y  
- **Evidência:** `legal-document-shell.tsx`  
- **Severidade:** **P2**  
- **Tamanho:** XS

### AUD-013 — Focus trap ausente em menus/dialogs
- **Domínio:** a11y  
- **Severidade:** **P2**  
- **Tamanho:** S

### AUD-014 — Touch targets &lt; 44px em superfícies pontuais
- **Domínio:** mobile UX  
- **Severidade:** **P2**  
- **Tamanho:** S

### AUD-015 — Error/loading boundaries incompletos
- **Domínio:** confiabilidade UX  
- **Evidência:** só `app/error.tsx`; loading parcial  
- **Severidade:** **P2**  
- **Tamanho:** S

### AUD-016 — Observabilidade: 401/400 chat e falhas client sem telemetria
- **Domínio:** ops  
- **Severidade:** **P2**  
- **Tamanho:** S

### AUD-017 — Lint warnings theology eval
- **Domínio:** qualidade  
- **Severidade:** **P3**  
- **Tamanho:** XS

### AUD-018 — Comentários stale no journey repository
- **Domínio:** manutenção  
- **Severidade:** **P3**  
- **Tamanho:** XS

### AUD-019 — Entitlements reservados ainda no catálogo (voice, personas, etc.)
- **Domínio:** produto / confiança  
- **Evidência:** `reserved.ts` + display upcoming  
- **Severidade:** **P2** (se copy confundir) — mitigado por `upcomingBenefits`  
- **Tamanho:** S

### AUD-020 — Sem help center / intake estruturado
- **Domínio:** suporte  
- **Severidade:** **P2**  
- **Tamanho:** M (HC V1)

### AUD-021 — Acquisition attribution V1 incompleta vs receita
- **Domínio:** aquisição  
- **Severidade:** **P3**  
- **Tamanho:** M

### AUD-022 — Daily report revenue null (docs)
- **Domínio:** ops  
- **Severidade:** **P3**  
- **Tamanho:** M

### AUD-023 — Biblical passages demo-limited (docs)
- **Domínio:** produto  
- **Severidade:** **P3**  
- **Tamanho:** L

### AUD-024 — Streaming de chat ausente
- **Domínio:** UX latência  
- **Severidade:** **P3**  
- **Tamanho:** XL

### AUD-025 — Plan change / proration não implementados
- **Domínio:** billing  
- **Severidade:** **P3** (intencional; não iniciar antes smoke financeiro)  
- **Tamanho:** XL  
- **Pagamento:** sim

### AUD-026 — `preferred_depth` writable no client sem gate de plano
- **Domínio:** entitlements  
- **Severidade:** **P3** (deep ainda gated no chat)  
- **Tamanho:** S

### AUD-027 — Chat aria-live ruidoso
- **Domínio:** a11y  
- **Severidade:** **P3**  
- **Tamanho:** S

### AUD-028 — force-dynamic amplo (custo/perf)
- **Domínio:** performance  
- **Severidade:** **P3**  
- **Tamanho:** M

### AUD-029 — Export admin CSV escala Auth lookups
- **Domínio:** admin perf  
- **Severidade:** **P3**  
- **Tamanho:** M

### AUD-030 — Sem `pnpm audit` / SCA nesta etapa
- **Domínio:** supply chain  
- **Severidade:** **P2** (lacuna)  
- **Tamanho:** S

### AUD-031 — WhatsApp share vs política (ok, monitorar)
- **Domínio:** produto  
- **Descrição:** share `wa.me` é orgânico; entitlement Particular não abre pastoral chat — alinhado.  
- **Severidade:** **P3**  
- **Tamanho:** — 

### AUD-032 — CRLF noise em repositories/index.ts
- **Domínio:** git hygiene  
- **Severidade:** **P3**  
- **Não commitar**

---

## 17. Evidências (gates e git)

```
HEAD=6be18de … docs: add launch resumption runbook
ancestor(7113493)=true
tests=739 passed
build=OK
lint=0 errors / 5 warnings
theology journeys/ci=OK
launch:check=OK
dirty=repositories/index.ts (CRLF only)
```

---

## 18. Quick wins (após aprovação; não feitos aqui)

1. Corrigir `AppError` em `journeys/api-auth.ts` + teste (AUD-006)  
2. Atualizar `DATABASE.md` status 005–008 (AUD-003)  
3. Skip-link id em legal shell (AUD-012)  
4. Remover eslint-disable mortos (AUD-017)  
5. Checklist read-only remoto: confirmar tabelas 005–007 e policies 004 (AUD-004/001)

---

## 19. Riscos estruturais

1. Dependência de smoke humano para features já em `main`.  
2. Endurecimento DB (004) desacoplado do deploy de app que assume writes via service role.  
3. Teologia/crise: promises implícitas vs implementação.  
4. Operação single-operator no celular sem Admin Mobile V1.  
5. Testes string-based dão falsa confiança sem E2E/RLS live.

---

## 20. Lacunas de informação

- Estado real RLS/policies no projeto Supabase de produção (sem query remota).  
- Confirmação de deploy SHA via `/api/health` em produção (não chamado nesta etapa para evitar dependência operacional externa não autorizada como “alteração”; health é read-only — **não consultado** por escolha de isolamento da auditoria local).  
- Resultado do smoke autenticado Jornadas.  
- `pnpm audit` / Dependabot status.  
- Volume real de usuários/assinaturas (PII — não coletado).

---

## 21. Conclusão de prontidão

| Dimensão | Nota |
|----------|------|
| Código + testes locais | Pronto |
| Gates CI locais | Verde |
| Jornadas em produção | Código pronto; **smoke humano pendente** |
| Segurança DB hardening | **Não pronta** até 004 |
| Pagamentos | Código hardened; **smoke financeiro futuro** |
| Admin mobile | Parcial |
| Autonomia de QA | Baixa sem E2E |

**Recomendação:** não tratar o produto como “fechado operacionalmente” até executar verificação read-only de schema (005–008/004), smoke autenticado Jornadas, e iniciar bloco de testes automatizados de uso real (ver documentos irmãos). Primeiro bloco de implementação: ver `AMEM_EXECUTION_BACKLOG_2026-07-20.md` bloco B01.

---

*Nenhuma migration, alteração remota, deploy, chamada paga ou modificação financeira foi realizada nesta auditoria.*
