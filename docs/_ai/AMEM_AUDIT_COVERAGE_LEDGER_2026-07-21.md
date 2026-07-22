# Amém Chat — Audit Coverage Ledger

**Data:** 2026-07-21
**Tip auditado na entrada:** `358142e`
**Tip de produto validado:** `c03ff10`
**Escopo:** inventário verificável do que foi inspecionado nesta auditoria-mestre (somente leitura de código + documentação; sem remoto).

---

## 0. Estado Git na entrada

| Item | Valor |
|------|-------|
| Branch | `main` |
| HEAD | `358142e` (`docs: reconcile sprint five final state`) |
| `origin/main` | `358142e` |
| Ahead/behind | `0 0` |
| Staged | vazio |
| Working tree | apenas `M src/lib/database/repositories/index.ts` (ruído CRLF; `git diff` sem hunk de conteúdo) |
| `c03ff10` no histórico | sim (`merge-base --is-ancestor` exit 0; segundo commit no log) |
| Log de `repositories/index.ts` | último commit de conteúdo: `485f385` (não nas cinco sprints) |

**Limitação:** não houve `git fetch`; `origin/main` é o remoto localmente conhecido.

---

## 1. Diretórios examinados

| Diretório / grupo | Status | Notas |
|-------------------|--------|-------|
| `src/app` | Inspecionado | 38 pages, layouts, loadings, errors, APIs |
| `src/components` | Inspecionado | 55 componentes (33 client / 22 server) |
| `src/lib` | Inspecionado | AI, auth, billing, stripe, admin, journeys, entitlements, logging, etc. |
| `src/hooks` | Ausente / vazio | Sem hooks dedicados |
| `src/types` | Ausente como pasta | Tipos co-localizados |
| `src/config` | Inspecionado | brand, legal, runtime |
| `src/proxy.ts` | Inspecionado | entry edge (sem `middleware.ts`) |
| `supabase/migrations` | Inspecionado | 001–008 |
| `supabase/postchecks` | Inspecionado | 2 arquivos |
| `tests` | Inspecionado | 93 `*.test.ts` + helpers/fixtures |
| `scripts` | Inspecionado | 4 scripts |
| `docs` + `docs/_ai` | Inspecionado | 33 docs + sprints/matriz |
| `public/` | **Ausente** | OG/icon gerados em `src/app` |
| `.github/` | **Ausente** | Sem CI workflows no repo |
| `package.json` / lockfile | Inspecionado | `pnpm audit --prod` executado |
| `next.config.ts` | Inspecionado | CSP/headers |
| `vercel.json` | Inspecionado | cron daily-report |
| `.env.example` | Inspecionado | 30 vars |
| `vitest.config.ts` / eslint / tsconfig | Inspecionado | — |

---

## 2. Contagens verificáveis

| Métrica | Contagem |
|---------|----------|
| Páginas públicas | 16 |
| Páginas autenticadas | 13 |
| Páginas admin | 9 |
| Layouts | 3 |
| Loading boundaries | 8 |
| Error boundaries | 4 |
| Not-found | 1 |
| APIs públicas (health) | 2 |
| APIs autenticadas (user) | 11 |
| APIs admin | 4 |
| Cron + webhook | 2 |
| Auth callbacks (fora `/api`) | 2 |
| Server actions | 8 |
| Componentes | 55 |
| Repositories (arquivos) | 7 |
| Migrations | 8 |
| Postchecks | 2 |
| Scripts | 4 |
| Arquivos de teste `*.test.ts` | 93 |
| Scripts real-usage (package) | 18 arquivos no gate |
| Eval tests | 4 |
| Docs operacionais + `_ai` | 33 |
| Feature flags formais | 0 (`DEMO_MODE` + persona `active`) |
| Env vars `.env.example` | 30 |
| Env vars referenciadas em `src` | ~41 |

---

## 3. Rotas de página (ledger)

### Públicas (marketing + auth entry)

`(marketing)/`, `planos`, `transparencia-ia`, `uso-justo`, `cancelamento`, `termos`, `ajuda`, `privacidade`, `mensagens-personalizadas`, `como-funciona`, `entrar`, `cadastro`, `recuperar-senha`, `redefinir-senha`, `confira-seu-email`, `email-confirmado`.

### Autenticadas

`onboarding`, `inicio`, `conversar`, `conversas`, `jornada`, `jornadas`, `jornadas/[slug]`, `jornadas/[slug]/[step]`, `conta`, `personalizar`, `assinar/continuar`, `assinatura/sucesso`, `assinatura/cancelada`.

### Admin

`admin`, `relatorios`, `usuarios`, `usuarios/[userId]`, `custos`, `aquisicao`, `uso`, `parceiros`, `eventos`.

---

## 4. APIs inspecionadas

`/api/health`, `/api/health/db`, `/api/chat`, `/api/usage`, `/api/account/export`, `/api/account/plan-interest`, `/api/billing/portal`, `/api/billing/checkout-success`, `/api/journeys/*` (events, progress, start, complete, reset), `/api/admin/stripe/readiness`, `/api/admin/reports/generate`, `/api/admin/usuarios/export`, `/api/reports/daily`, `/api/cron/daily-report`, `/api/webhooks/stripe`, `/auth/callback`, `/auth/confirm`.

---

## 5. Migrations / postchecks

| Arquivo | Inspecionado |
|---------|--------------|
| `20260712000001` … `008` | Sim (headers + políticas críticas da 004) |
| Postcheck 008 + consolidado | Sim (existência + doc DATABASE) |

**Não acessível nesta auditoria:** estado live do Supabase, apply remoto, RLS live.

---

## 6. Documentos reconciliados

Inspecionados (não atualizados nesta rodada):

- `AMEM_FULL_PRODUCT_ENGINEERING_AUDIT_2026-07-20.md`
- `AMEM_EXECUTION_BACKLOG_2026-07-20.md`
- sprints 1–5 + matriz final + human packs + financial smoke + plan matrix + Playwright spike
- `NEXT_STEPS.md`, `DATABASE.md`, `DEPLOYMENT.md`, `READING_JOURNEYS.md`, `DAILY_REPORTS.md`, `PRODUCTION_CUTOVER_RUNBOOK.md`, `LAUNCH_CHECKLIST.md`
- `COMMERCIAL_PLANS.md`, `AI_AND_THEOLOGY.md`, `THEOLOGY_EVALUATIONS.md`, `USER_DATA_PORTABILITY.md`, `ARCHITECTURE.md`

---

## 7. Testes / evals / scripts

| Gate / grupo | Inspecionado |
|--------------|--------------|
| `pnpm test:real-usage` (18 arquivos) | Inventário + amostra de escopo |
| Theology evals + journey evals | Docs + detectors + harness notes |
| `scripts/launch-check.cjs` | Escopo estático confirmado |
| Suite geral (`93` arquivos) | Classificação por domínio |
| Coverage instrumentada | **Não configurada** — matriz funcional usada |

---

## 8. Integrações

| Integração | Código | Remoto |
|------------|--------|--------|
| Supabase Auth/DB | Inspecionado | Não acessado |
| Stripe | Inspecionado | Não chamado |
| OpenAI | Inspecionado | Não chamado |
| Vercel | `vercel.json` + docs | Não alterado |
| Resend/e-mail Auth | Docs | Não validado deliverability |
| Instagram | Handle em brand | Não validado conta |

---

## 9. Itens não acessíveis / limitações

1. Supabase remoto (SQL, RLS live, B00).
2. Stripe test/live.
3. OpenAI real.
4. Deploy Vercel / DNS.
5. Contas reais / dados pessoais.
6. Playwright (não instalado; spike DEFER).
7. Coverage % automática (não configurada).
8. Browser smoke humano / pastoral.
9. `git fetch` proibido — remoto pode ter avançado sem este clone saber.
10. `repositories/index.ts` não aberto para edição (ruído CRLF local apenas).

---

## 10. Comandos de prova executados (fase 0 + audit)

- `git status --short`, `git rev-parse HEAD`, `git rev-parse origin/main`
- `git log --oneline --decorate -40`
- `git diff --check`, `git diff --stat`
- `git log --oneline --all -- src/lib/database/repositories/index.ts`
- `git merge-base --is-ancestor c03ff10 HEAD` (exit 0)
- `pnpm audit --prod` (2 advisories: sharp high, postcss moderate — transitivos via Next)

Gates de fechamento: ver documento mestre e plano de créditos.
