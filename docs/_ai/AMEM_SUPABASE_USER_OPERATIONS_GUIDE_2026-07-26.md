# Guia operacional — usuários no Supabase

**Data:** 2026-07-26  
**Somente docs.** Sem queries com PII em tickets/prints.  
**Produção publicada:** `461736d` · MIG **009** aplicada 2026-07-26 · MIG **004** não aplicada

---

## 1. Três camadas (não confundir)

| Camada | Onde | O que é |
|--------|------|---------|
| **Auth Users** | Dashboard → **Authentication → Users** | Identidade Supabase Auth (`auth.users`): e-mail, confirmed_at, last_sign_in, ban, factors |
| **profiles** | Table Editor / SQL `public.profiles` | Perfil de produto (FK do user id): dados de conta espiritual/app, não billing Stripe |
| **subscriptions / billing** | `subscriptions`, `billing_customers`, `payment_events`, `signup_intents` | Estado comercial; espelho Stripe + intents |

E-mail “canônico” para login: **Auth Users**.  
Admin app correlaciona por sessão + `admin_roles`, não por editar Auth à mão.

---

## 2. Onde o e-mail aparece

| Superfície | Uso |
|------------|-----|
| Auth → Users | Busca/login/reset |
| Admin `/admin/usuarios` | Operação (só admin) |
| Stripe Customer | Cobrança (e-mail do customer) |
| Export `/conta` | Dados do próprio usuário |

**Não** colar e-mails em issues públicas, Discord, ou prints de PR.

---

## 3. Busca segura (humano)

1. Preferir Admin do Amém (requer `admin_roles`) com motivo de suporte.  
2. Se Dashboard Auth: buscar por e-mail exato; não exportar listas.  
3. Correlacionar Auth id ↔ profile id (mesmo UUID) **sem** publicar o UUID em canais abertos.  
4. Billing: Stripe Dashboard por customer e-mail / id — não editar `payment_events` manualmente.

---

## 4. O que **não** editar manualmente

| Objeto | Por quê |
|--------|---------|
| Rows de `subscriptions` “para consertar plano” | Webhook/source of truth Stripe |
| `payment_events` status | Idempotência / lease |
| `usage_events` / mensagens de terceiros | Integridade + privacidade |
| `journey_progress` de outro user | Ownership RLS |
| Senhas / tokens em SQL | Auth flows oficiais |
| `admin_roles` sem processo | Escalação de privilégio |

Correções: Stripe Dashboard + suporte app + runbooks (`AMEM_MANUAL_ACCOUNT_DELETION_AND_RETENTION_RUNBOOK_*`).

---

## 5. Segurança / prints

| Proibido em evidências compartilhadas | Alternativa |
|---------------------------------------|-------------|
| E-mail completo + conteúdo de chat | Mascarar `a***@***` · só ids internos |
| JWT / service role | Nunca |
| Cartão / Stripe secrets | Nunca |
| Mensagem de crise verbatim | Só “crisis intercept ok” + requestId |

---

## 6. Correlação Admin ↔ Auth sem PII extra

| Dado | Uso |
|------|-----|
| requestId / payment event id | Debug |
| planKey + status | Comercial |
| “usuário N” / hash curto | Comunicação interna |
| UUID completo | Só canal seguro ops |

---

## 7. MIG notes (ops)

- **009** aplicada 2026-07-26 · postcheck `overall_ok=true` — grants anon Jornadas endurecidos.  
- **004** ainda **não** aplicada — não “consertar” RLS via edits manuais de policies fora do pack.
