# Deployment — Amém Chat (repo: guia-escrituras)

> Estado: código de lançamento **implementado e testado localmente**.  
> Cutover operacional: seguir `docs/PRODUCTION_CUTOVER_RUNBOOK.md` e `docs/LAUNCH_CHECKLIST.md`.  
> **Não trate este documento como prova de validação em produção.**

## Variáveis locais (`.env.local`)

Copie de `.env.example`. Mínimo para desenvolvimento autenticado:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` temporário)
- `OPENAI_API_KEY` (opcional em development — usa MockAiProvider)
- `NEXT_PUBLIC_APP_URL` / `APP_URL`

Para writes confiáveis (assistant / usage / cron / admin com secret):

- `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY` temporário) — **somente servidor**

Matriz completa (nomes/classificação): `pnpm launch:check` e o runbook.

## Variáveis na Vercel

Production / Preview (presença; nunca documentar valores):

| Variável | Obrigatória |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | sim |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim |
| `SUPABASE_SECRET_KEY` | sim (server) |
| `OPENAI_API_KEY` | sim em production |
| `OPENAI_MODEL_DEFAULT` / `OPENAI_MODEL_DEEP` | recomendado |
| `NEXT_PUBLIC_APP_URL` / `APP_URL` | sim (`https://amemchat.com.br`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | sim em production (live) |
| `STRIPE_PRICE_ESSENCIAL` / `_CAMINHO` / `_PROFUNDO` | sim se cobrando |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | sim antes de billing ao vivo |
| `USD_BRL_PLANNING_RATE` | recomendado |
| `CRON_SECRET` | sim em production (relatório diário) |
| `DEMO_MODE` | apenas preview, se quiser mocks |

Em **production**, `DEMO_MODE` não libera mocks.

Resend/SMTP: configurado no **Supabase Auth**, não como env do app Next.js.

## Supabase

1. Projeto vinculado; migrations **001–003** aplicadas.
2. Auth → URL configuration:
   - Site URL: URL de production
   - Redirect URLs: `https://amemchat.com.br/auth/callback`, `https://amemchat.com.br/auth/confirm`, previews se necessário
3. Confirmar e-mail conforme política do produto.

## Migration 004 (manual, futuro)

Arquivo: `supabase/migrations/20260712000004_production_hardening.sql`

**Não aplicar no cutover inicial.** Quando for o momento (decisão independente):

```bash
# Revisar o SQL, depois (exemplo):
pnpm exec supabase db push --linked
# ou colar no SQL Editor após revisão humana
```

Efeitos: remove insert autenticado em `usage_events` e writes em summaries; restringe insert de messages a `role=user`; endurece `security definer`; índices únicos Stripe/request_id.

## Stripe (código live-ready)

Checkout, webhook, cancelamento e reativação estão **implementados no código** e cobertos por testes locais.  
Configuração live (keys, prices, webhook endpoint) **ainda depende do painel Stripe + Vercel** — ver runbook.

## Criar o primeiro admin

Via SQL Editor (service role / dashboard), **nunca** pela UI:

```sql
insert into public.admin_roles (user_id, role)
values ('<uuid-do-usuario>', 'admin');
```

O usuário precisa existir em `auth.users` / `profiles`.

## Assinatura de teste (dev / sem cobrança)

Não há plano gratuito. Para liberar chat a um usuário de teste em ambiente controlado:

```sql
insert into public.subscriptions (user_id, plan_key, status)
values ('<uuid>', 'caminho', 'active');
```

## Smoke tests (após deploy)

1. `/` carrega marca Amém Chat
2. `/api/health` → `status: ok` (sem secrets). Prova runtime/SHA/env público — **não** Stripe/OpenAI/billing.
3. `/api/health/db` → `ok` + `latencyMs` (ou 503 se misconfig). Não substitui smoke financeiro nem RLS live.
4. Cadastro → e-mail → callback → onboarding → `/inicio`
5. Sem assinatura: chat retorna 402
6. Com assinatura + OpenAI: conversa persiste em `messages` / `usage_events`
7. `/admin` sem `admin_roles` → redirect `/inicio`
8. Relatório diário: `docs/DAILY_REPORTS.md` (`CRON_SECRET`, cron 00:15 UTC)
9. Checklist humano completa: `docs/LAUNCH_CHECKLIST.md`

## O que ainda é limitado / futuro

- Receita em dinheiro Stripe no `daily_reports` (`revenueBrlCents` permanece null)
- Códigos HTTP do chat (409/429/503) só em logs — sem coluna no banco
- Fonte bíblica textual (trechos de demonstração)
- Pagamento de indicações (rewards)
- Streaming no chat
- Validação em produção dos itens remotos da checklist
