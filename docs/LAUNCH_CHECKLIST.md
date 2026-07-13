# Launch checklist — Amém Chat (15/07/2026)

Checklist manual de cutover. **Não incluir valores de secrets neste arquivo.**

## 1. Domínio e URLs

- [ ] DNS `amemchat.com.br` apontando para a Vercel (A/CNAME conforme painel)
- [ ] `APP_URL` e `NEXT_PUBLIC_APP_URL` = origem HTTPS pública (sem localhost)
- [ ] Confirmar canonical/OG/sitemap com a URL de produção

## 2. Supabase Auth

- [ ] Site URL = origem de produção
- [ ] Redirect URLs incluem `/auth/callback` e `/auth/confirm`
- [ ] SMTP Resend (ou provedor) ativo para e-mails de confirmação/recuperação

## 3. Resend / e-mail

- [ ] Domínio autenticado (SPF/DKIM)
- [ ] Teste de e-mail de confirmação de cadastro
- [ ] Teste de recuperação de senha

## 4. Stripe live

- [ ] Conta Stripe ativada para live
- [ ] Produtos/prices live alinhados aos planos (sem alterar preços de produto sem revisão)
- [ ] `STRIPE_SECRET_KEY` live na Vercel
- [ ] Webhook live apontando para `/api/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` live correspondente
- [ ] Um teste real controlado de checkout + webhook
- [ ] Cancelamento/reativação nativos verificados em live (ou sandbox espelhado previamente)

## 5. OpenAI production

- [ ] `OPENAI_API_KEY` de produção
- [ ] Modelos default/deep confirmados
- [ ] Smoke de conversa com grounding bíblico

## 6. Smoke funcional (mobile + desktop)

- [ ] Cadastro com plano Essencial/Caminho
- [ ] Confirmação de e-mail
- [ ] Onboarding + tradição
- [ ] Checkout
- [ ] Chat (nova conversa + reabrir histórico `/conversas` → `/conversar?c=`)
- [ ] Cancelamento de renovação em `/conta`
- [ ] Admin overview + busca de usuários (operadores)

## 7. Observabilidade

- [ ] `/api/health` ok (sem secrets)
- [ ] `/api/health/db` ok/latência
- [ ] Admin mostra timestamp e avisos de métricas parciais/estimativas

## 8. Rollback

- [ ] Tag/commit de rollback conhecido no `main`
- [ ] Plano para reverter env Stripe/OpenAI sem apagar dados
- [ ] Contato operacional para incidente no dia do lançamento
