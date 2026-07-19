# Deployment — Amém Chat (repo: guia-escrituras)

## Variáveis locais (`.env.local`)

Copie de `.env.example`. Mínimo para desenvolvimento autenticado:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` temporário)
- `OPENAI_API_KEY` (opcional em development — usa MockAiProvider)
- `NEXT_PUBLIC_APP_URL` / `APP_URL`

Para persistir mensagens assistant / usage após a migration 004:

- `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY` temporário) — **somente servidor**

## Variáveis na Vercel

Production / Preview:

| Variável | Obrigatória |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | sim |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim |
| `SUPABASE_SECRET_KEY` | sim (após migration 004) |
| `OPENAI_API_KEY` | sim em production |
| `OPENAI_MODEL_DEFAULT` / `OPENAI_MODEL_DEEP` | recomendado |
| `NEXT_PUBLIC_APP_URL` | sim (URL canônica) |
| `USD_BRL_PLANNING_RATE` | recomendado |
| `CRON_SECRET` | sim em production (relatório diário) |
| `DEMO_MODE` | apenas preview, se quiser mocks |

Em **production**, `DEMO_MODE` não libera mocks.

## Supabase

1. Projeto já vinculado (CLI) e migrations 001–003 aplicadas.
2. Auth → URL configuration:
   - Site URL: URL de production
   - Redirect URLs: `https://<domínio>/auth/callback`, `https://<domínio>/auth/confirm`, previews se necessário
3. Confirmar e-mail conforme política do produto.

## Migration 004 (manual, futuro)

Arquivo: `supabase/migrations/20260712000004_production_hardening.sql`

**Ainda não aplicar nesta iteração.** Quando for o momento:

```bash
# Revisar o SQL, depois (exemplo):
pnpm exec supabase db push --linked
# ou colar no SQL Editor após revisão humana
```

Efeitos: remove insert autenticado em `usage_events` e writes em summaries; restringe insert de messages a `role=user`; endurece `security definer`; índices únicos Stripe/request_id.

## Criar o primeiro admin

Via SQL Editor (service role / dashboard), **nunca** pela UI:

```sql
insert into public.admin_roles (user_id, role)
values ('<uuid-do-usuario>', 'admin');
```

O usuário precisa existir em `auth.users` / `profiles`.

## Assinatura de teste (sem Stripe ainda)

Não há plano gratuito. Para liberar chat a um usuário de teste:

```sql
insert into public.subscriptions (user_id, plan_key, status)
values ('<uuid>', 'caminho', 'active');
```

## Smoke tests

1. `/` carrega marca Amém Chat
2. `/api/health` → `status: ok`
3. `/api/health/db` → `ok` + `latencyMs` (ou 503 se misconfig)
4. Cadastro → e-mail → callback → onboarding → `/inicio`
5. Sem assinatura: chat retorna 402
6. Com assinatura + OpenAI: conversa persiste em `messages` / `usage_events`
7. `/admin` sem `admin_roles` → redirect `/inicio`
8. Relatório diário: ver `docs/DAILY_REPORTS.md` (`CRON_SECRET`, cron 00:15 UTC)

## O que ainda é limitado / futuro

- Receita em dinheiro Stripe no `daily_reports` (`revenueBrlCents` permanece null)
- Códigos HTTP do chat (409/429/503) só em logs — sem coluna no banco
- Fonte bíblica textual (trechos de demonstração)
- Pagamento de indicações (rewards)
- Streaming no chat
