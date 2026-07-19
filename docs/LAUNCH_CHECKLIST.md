# Launch checklist — Amém Chat

Checklist de cutover. **Não incluir valores de secrets neste arquivo.**

Legenda de estado:
- `[x]` implementado e testado **localmente**
- `[ ]` depende de **produção** / configuração remota
- `[ ]` depende de **verificação humana**
- `[ ]` **pós-lançamento**

Nada abaixo marcado como `[x]` significa “já validado em produção”.

---

## 0. Código local (pré-cutover)

- [x] Admin Operations V1 (lista, detalhe, CSV, proteção `/admin` e `/api/admin/*`)
- [x] Chat Reliability & Rate Limit V1 (idempotência, retry, burst técnico)
- [x] SEO, OG & Social Sharing Readiness V1 (canonical, robots, sitemap, OG)
- [x] Launch Operations & Daily Reporting V1 (cron + relatório diário + auth `CRON_SECRET`)
- [x] Histórico e reabertura de conversa
- [x] Resposta Profundo on-demand
- [x] Onboarding / personalização
- [x] Checkout Stripe real (código) + prevenção de assinatura duplicada
- [x] Cancelamento / reativação nativos (código)
- [x] UTM / referral (código)
- [x] Health sem exposição de secrets; logs mascarados
- [x] Rotas privadas com noindex
- [x] Relatórios/exports sem conteúdo de conversa
- [x] Suíte de testes + lint + build verdes localmente
- [x] Runbook: `docs/PRODUCTION_CUTOVER_RUNBOOK.md`
- [x] `pnpm launch:check` (checagens estáticas locais)

## 1. Domínio e URLs — depende de produção

- [ ] DNS `amemchat.com.br` apontando para a Vercel
- [ ] Redirecionamento **www → apex**
- [ ] `APP_URL` e `NEXT_PUBLIC_APP_URL` = `https://amemchat.com.br` na Vercel
- [ ] Canonical/OG/sitemap respondendo no domínio de produção
- [ ] Cookies de auth sem `Domain` www-bound (host-only no apex)

## 2. Supabase Auth — depende de produção

- [ ] Site URL = origem de produção
- [ ] Redirect URLs incluem `/auth/callback` e `/auth/confirm`
- [ ] SMTP (Resend ou equivalente) ativo no Supabase

## 3. Resend / e-mail — depende de produção + humano

- [ ] Domínio autenticado (SPF/DKIM)
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL` configurado na Vercel (P0 antes de billing ao vivo)
- [ ] Templates conforme `docs/AUTH_EMAIL_TEMPLATES.md`
- [ ] Teste humano: e-mail de confirmação de cadastro
- [ ] Teste humano: recuperação de senha

## 4. Stripe live — depende de produção + humano

- [ ] Conta Stripe live ativada
- [ ] Produtos/prices live alinhados (sem mudar preço de produto sem revisão)
- [ ] `STRIPE_SECRET_KEY` live na Vercel
- [ ] Webhook live → `/api/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` live correspondente
- [ ] Pagamento real controlado + webhook
- [ ] Cancelamento/reativação verificados em live

## 5. OpenAI production — depende de produção + humano

- [ ] `OPENAI_API_KEY` de produção na Vercel
- [ ] Modelos default/deep confirmados
- [ ] Smoke humano de conversa com grounding bíblico

## 6. Cron / relatórios — depende de produção

- [ ] `CRON_SECRET` na Vercel Production
- [ ] Cron Vercel invocando `/api/cron/daily-report`
- [ ] Relatório UTC gerado (cron ou manual em `/admin/relatorios`)

## 7. Smoke funcional — verificação humana

- [ ] Home mobile
- [ ] Cadastro → confirmação → personalização → conversa
- [ ] Mensagem seguinte + Profundo + histórico
- [ ] Checkout → retorno → assinatura reconhecida
- [ ] Cancelamento de renovação + reativação em `/conta`
- [ ] Admin com operador; usuário comum bloqueado
- [ ] CSV administrativo sem texto de conversa
- [ ] WhatsApp/OG, robots, sitemap no domínio live

## 8. Observabilidade — produção + humano

- [ ] `/api/health` ok (sem secrets)
- [ ] `/api/health/db` ok/latência
- [ ] Admin overview com timestamp e avisos de métricas parciais

## 9. Rollback — pronto no papel; executar só se P0

- [x] Procedimento documentado no runbook
- [ ] Tag/commit de rollback conhecido no ambiente Vercel
- [ ] Contato operacional no dia do lançamento

## 10. Migration 004 — pós-lançamento / decisão independente

- [ ] **Não aplicar** no cutover inicial
- [ ] Revisar SQL e decidir em janela própria (`docs/DEPLOYMENT.md`)

## 11. Pós-lançamento (não bloqueante)

- [ ] Fonte bíblica licenciada
- [ ] Streaming no `/api/chat`
- [ ] Ledger de receita Stripe no daily report
- [ ] Persistência estruturada de falhas HTTP do chat (exigiria migration)
- [ ] Alertas externos (e-mail) de operação
