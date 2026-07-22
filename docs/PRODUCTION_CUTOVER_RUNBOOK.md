# Production cutover runbook — Amém Chat

Runbook operacional curto. Detalhes longos ficam em `DEPLOYMENT.md`, `DAILY_REPORTS.md` e `LAUNCH_CHECKLIST.md`.
**Nunca cole secrets neste arquivo.**

Estado do código (local): implementado e testado com lint/test/build.  
Estado de produção: **ainda depende de configuração remota + smoke humano**.

---

## A. Pré-deploy

1. `git fetch origin && git checkout main && git pull`
2. Confirmar `git rev-parse HEAD` === `git rev-parse origin/main`
3. Working tree limpa, exceto ruído CRLF conhecido em `src/lib/database/repositories/index.ts` (ignorar; **não commitá-lo**)
4. `pnpm lint`
5. `pnpm test` (repetir se houve mudança recente em env/mocks)
6. `pnpm build`
7. `pnpm launch:check`
8. Migrations: confirmar **001–003** já aplicadas no projeto Supabase de produção
9. Migration **004** (`20260712000004_production_hardening.sql`): **não aplicar** neste cutover, salvo decisão explícita e independente depois

---

## B. Variáveis obrigatórias na Vercel

Validar **presença** (Production). Nunca imprimir valores.

| Nome | Finalidade | Classe | Production | Preview |
|------|------------|--------|------------|---------|
| `APP_URL` | Origem canônica server (auth redirects, Stripe return) | server | obrigatória | recomendada |
| `NEXT_PUBLIC_APP_URL` | Origem pública (SEO/OG/cliente) | pública | obrigatória | recomendada |
| `NEXT_PUBLIC_SUPABASE_URL` | Projeto Supabase | pública | obrigatória | obrigatória |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública (preferida) | pública | obrigatória* | obrigatória* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Compatibilidade se publishable ausente | pública | alternativa* | alternativa* |
| `SUPABASE_SECRET_KEY` | Writes server-only / admin / cron | server · sensível | obrigatória | recomendada |
| `SUPABASE_SERVICE_ROLE_KEY` | Compatibilidade secret | server · sensível | alternativa | alternativa |
| `OPENAI_API_KEY` | Chat real | server · sensível | obrigatória | obrigatória† |
| `OPENAI_MODEL_DEFAULT` / `OPENAI_MODEL_DEEP` | Modelos | server | recomendada | recomendada |
| `STRIPE_SECRET_KEY` | Checkout live | server · sensível | obrigatória | sandbox ok |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe | server · sensível | obrigatória | se webhook ativo |
| `STRIPE_PRICE_ESSENCIAL` / `_CAMINHO` / `_PROFUNDO` | Price IDs | server | obrigatória | se cobrando |
| `CRON_SECRET` | Auth do cron daily-report | server · sensível | obrigatória | se testar cron |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Contato / legal / P0 billing | pública | obrigatória | recomendada |
| `USD_BRL_PLANNING_RATE` | Estimativa de custo (não fatura) | server | recomendada | opcional |
| `DEMO_MODE` | Mocks só em preview | server | **proibido** | opcional |

\* Uma de publishable/anon.  
† Ou `DEMO_MODE=true` apenas em Preview.

Resend: **não** é env do app — SMTP fica no painel Supabase Auth.

Checklist rápida: `APP_URL` e `NEXT_PUBLIC_APP_URL` = `https://amemchat.com.br` (sem localhost, sem `*.vercel.app` como canônico).

---

## C. Serviços externos

| Serviço | Ação |
|---------|------|
| DNS | Apex `amemchat.com.br` → Vercel; www → apex |
| Supabase Auth | Site URL = produção; Redirect URLs com `/auth/callback` e `/auth/confirm` |
| Stripe live | Produto/preços alinhados; webhook → `https://amemchat.com.br/api/webhooks/stripe` |
| Stripe eventos | Incluir subscription + checkout session events já tratados pelo código |
| Resend/SMTP | Domínio autenticado no provedor usado pelo Supabase |
| OpenAI | Key de produção (sem mocks) |
| Vercel Cron | `vercel.json`: `/api/cron/daily-report` @ `15 0 * * *` + `CRON_SECRET` |

---

## D. Ordem do deploy

1. Configurar/conferir envs na Vercel (Production)
2. Deploy de `main` (via fluxo Vercel já existente — **este runbook não executa deploy**)
3. Confirmar commit implantado (`/api/health` version/commitSha ou painel Vercel). Health verde confirma runtime/SHA e checks documentados — **não** prova Stripe, OpenAI, billing nem lançamento completo.
4. Health: `GET /api/health` e `GET /api/health/db` (db = latência básica; não substitui smoke financeiro)
5. Smoke público (home, planos, robots, sitemap)
6. Smoke autenticado (cadastro → e-mail → onboarding → chat)
7. Pagamento controlado + webhook (**obrigatório** — health não substitui)
8. Admin (operador) + bloqueio de usuário comum
9. Cron / geração manual de relatório
10. SEO/social (canonical + OG)
11. Se P0: rollback (seção F)

---

## Kill switches (incidente)

Em incidente de custo AI / teologia / Jornadas, Ops pode definir na Vercel (server-only):

- `FEATURE_DISABLE_CHAT=true`
- `FEATURE_DISABLE_JOURNEYS=true`
- `FEATURE_DISABLE_DEEPEN=true`

Redeploy/restart para aplicar. Código `feature_temporarily_disabled`. Não altera preços. Detalhe: `docs/DEPLOYMENT.md`.

## E. Smoke humano (checklist exata)

- [ ] Home mobile
- [ ] Cadastro
- [ ] Recebimento de e-mail
- [ ] Confirmação
- [ ] Personalização (onboarding)
- [ ] Primeira conversa
- [ ] Mensagem seguinte
- [ ] Resposta Profundo (on-demand)
- [ ] Histórico + reabertura (`/conversas` → `/conversar?c=`)
- [ ] Checkout live
- [ ] Pagamento real controlado
- [ ] Retorno pós-pagamento
- [ ] Reconhecimento da assinatura
- [ ] Cancelamento de renovação
- [ ] Reativação
- [ ] Admin com operador
- [ ] Usuário comum bloqueado no admin
- [ ] Export CSV (sem conteúdo de conversa)
- [ ] Relatório diário (cron ou manual)
- [ ] WhatsApp/OG preview
- [ ] Canonical apex
- [ ] `robots.txt`
- [ ] `sitemap.xml`

---

## F. Rollback

1. Identificar deploy anterior estável no painel Vercel
2. Reverter **somente o deploy** — **não** alterar banco; **não** aplicar migration 004 durante incidente
3. Manter endpoint de webhook compatível com o handler implantado (ou pausar eventos se necessário)
4. Interromper lançamento se: checkout live quebra, auth/e-mail fora, chat 503 em massa, dados/PII vazando
5. Registrar falha (hora UTC, commit, sintoma, impacto) e abrir follow-up — sem mascarar erro

---

## Pós-cutover imediato

- Confirmar relatório UTC de ontem gerado (ou gerar manualmente em `/admin/relatorios`)
- Revisar alertas operacionais no admin overview
- Só então comunicar “lançamento validado em produção”
