# Runbook — Exclusão manual de conta e retenção operacional

**Data:** 2026-07-22  
**Findings:** MAE-P1-04 / UG-12  
**Escopo:** processo humano de suporte. **Não** automatiza exclusão. **Não** apaga dados por este documento.

> Nenhum prazo legal é afirmado aqui sem fonte jurídica aprovada. Campos de retenção = **jurídico pendente**.

---

## Princípios

1. Self-service de exclusão **não existe** (apenas export em `/conta`).
2. Nunca executar SQL destrutivo sem ticket + identidade confirmada + checklist financeiro.
3. Preferir export antes da exclusão (`GET /api/account/export`).
4. Stripe e Auth são sistemas distintos do Postgres app.
5. Logs/backups/e-mail de suporte **não** têm purge cirúrgico no código do app.
6. Registrar a operação (ticket id, data, operador, escopo) — sem colar PII em docs/git.

---

## Inventário de dados (código/schema)

| Dado | Existe | Responsável | Local | Dependências | Ordem | Retenção | Evidência | Risco | Confirmação ao usuário | Jurídico |
|------|--------|-------------|-------|--------------|-------|----------|-----------|-------|------------------------|----------|
| Auth user | sim | Ops/Supabase | `auth.users` | raiz | final DB | pendente | Admin Auth / health | alto | e-mail conta removida | pendente |
| `profiles` | sim | App | Postgres | Auth CASCADE | com Auth | pendente | schema 001 | alto | — | pendente |
| `spiritual_profiles` | sim | App | Postgres | profiles CASCADE | cascata | pendente | schema 001 | sensível | — | pendente |
| `subscriptions` | sim | App+Stripe | Postgres | profiles; Stripe ids | após cancel Stripe | pendente fiscal | schema 001 | financeiro | acesso até period end | pendente |
| `billing_customers` | sim | App+Stripe | Postgres | profiles CASCADE | após Stripe | pendente | schema 006 | financeiro | — | pendente |
| `conversations` / `messages` / summaries | sim | App | Postgres | profiles CASCADE | cascata (ou purge explícito) | pendente | schema 001 | máximo | conteúdo removido | pendente |
| `usage_events` / `usage_monthly` | sim | App | Postgres | profiles CASCADE | cascata | pendente | schema 001 | custo/ops | — | pendente |
| `journey_progress` | sim | App | Postgres | profiles CASCADE | cascata | pendente | schema 008 | baixo (só steps) | — | pendente |
| Journey ops events | sim | App | **logs** | masked userId | N/A app | pendente | `journeys/events.ts` | baixo | — | pendente |
| Aquisição / UTM | sim | App | cookies + `signup_intents` | user_id SET NULL | limpar cookies; decidir purge intent | pendente | acquisition + 005 | marketing | — | pendente |
| `legal_consents` | sim | App | Postgres | profiles CASCADE | **confirmar** se prova deve ficar | pendente | schema 007 | compliance | — | **pendente crítico** |
| Plan interest | sim | App | logs only | — | N/A | pendente | plan-interest route | baixo | — | pendente |
| `daily_reports` | sim | App | agregados | sem user_id | **não** apagar por usuário | pendente | DAILY_REPORTS | baixo | — | pendente |
| Stripe customer/sub | sim | Finanças | Stripe | local mirror | cancelar/encerrar antes | pendente fiscal | stripe/* | alto | fatura/recibo | pendente |
| `payment_events` | sim | App | Postgres | sem user_id | manter | pendente | schema 006 | auditoria $ | — | pendente |
| `referral_*` | sim | App | Postgres | **attributions sem CASCADE** | limpar attributions **antes** | pendente | schema 001 | FK block | — | pendente |
| `admin_roles` | sim | Ops | Postgres | profiles CASCADE | remover papel se admin | pendente | schema 001 | privilégio | — | pendente |
| Logs runtime | sim | Ops/Vercel | stdout | masked | TTL plataforma | pendente | logger.ts | residual PII | — | pendente |
| Backups | ops | Ops | Supabase | snapshots | sobrescrita natural | pendente | UG-01 / MIG004 pack | residual | informar possível atraso | pendente |
| E-mails Auth | sim | Supabase/SMTP | provedor | Auth | fora do app | pendente | AUTH_EMAIL_* | residual | — | pendente |
| Inbox suporte | sim | Humano | e-mail | ticket | arquivar/apagar thread | pendente | HELP / support email | PII | — | pendente |
| sessionStorage drafts/checklist | sim | Cliente | browser | logout limpa | orientar logout/limpar | N/A | composer-draft / activation | baixo | — | N/A |
| Cookies Auth/acq | sim | Cliente | browser | signOut | logout | N/A | auth-cookie-options | sessão | — | N/A |

---

## Fluxo operacional

### 1. Solicitação recebida

- Canal: suporte (`NEXT_PUBLIC_SUPPORT_EMAIL`) / categoria privacidade no Help.
- Abrir ticket com data, canal, texto da solicitação (sem republicar conteúdo espiritual sensível em canais amplos).

### 2. Confirmação de identidade

- Exigir evidência de controle da conta (e-mail autenticado da conta, resposta a desafio não público).
- **Não** processar só porque o remetente usa nome parecido.

### 3. Prevenção de fraude

- Checar assinatura ativa / disputa Stripe em aberto.
- Se há chargeback/disputa: **pausar** exclusão de evidências financeiras até alinhamento finanças/jurídico (ver chargeback playbook).

### 4. Export opcional antes da exclusão

- Pedir que o titular baixe em `/conta` → “Baixar meus dados”, **ou**
- Ops autentica e usa o mesmo contrato de export (sem inventar dump paralelo).
- Confirmar `exportVersion` e ausência de secrets.

### 5. Cancelamento financeiro

- Cancelar renovação / encerrar sub no Stripe conforme política comercial vigente.
- Registrar `customer` / `subscription` ids **mascarados** no ticket.
- **Não** implementar proration nem alterar preços neste processo.

### 6. Preservação de obrigações fiscais

- Decisão jurídica: o que manter (invoices Stripe, `payment_events`, consentimentos).
- Até decisão: **não** apagar objetos fiscais no Stripe; preferir cancelamento + retenção do customer.

### 7. Deleção / anonimização no app (Postgres)

Ordem sugerida:

1. Remover/rewire `referral_attributions` (e rewards) onde o usuário é referrer ou referred.
2. Remover `admin_roles` se aplicável.
3. (Opcional auditável) DELETE explícito de `messages` → `conversations` / summaries.
4. Decisão sobre `legal_consents` e `signup_intents` (SET NULL já ocorre em Auth delete para intents).
5. DELETE `auth.users` (ou fluxo Admin “delete user”) → CASCADE em `profiles` e filhos com ON DELETE CASCADE.

**Não** reescrever `daily_reports` por um usuário.

### 8. Auth

- Confirmar usuário ausente em Auth Admin.
- Sessões/cookies invalidam no próximo `getUser` / após signOut.

### 9. Stripe

- Confirmar sub cancelada/encerrada.
- Customer: delete vs retain — **só após** jurídico/fiscal.

### 10. Logs

- Aceitar residual mascarado até TTL do provedor.
- Não tentar “scrub” de Vercel logs via app.

### 11. Backups

- Anotar que backups pré-exclusão podem reter dados até rotação.
- Não restaurar backup antigo sobre produção só para “desfazer” um usuário sem plano.

### 12. Conclusão

- Responder ao titular: conta encerrada / o que pode permanecer (financeiro/backup) **sem** inventar prazo legal.
- Orientar limpeza local: logout + fechar abas (sessionStorage).

### 13. Registro da operação

Ticket: id, operador, data UTC, passos (export? Stripe? Auth?), exceções. Sem colar mensagens de chat.

### 14. Exceções

- Conta admin única / key-person: seguir matriz de acessos antes.
- Disputa financeira aberta: preservar evidências.

### 15. Falhas parciais

- Se Auth ok mas Stripe falhou: reabrir passo 5; não declarar “total” ao usuário.
- Se FK `referral_attributions` bloqueou: voltar ao passo 7.1.

### 16. Reabertura

- Nova conta com mesmo e-mail após delete Auth = identidade nova; não “restaurar” histórico.

---

## O que este runbook **não** faz

- Self-service delete, migrations, jobs de retenção, MFA, audit trail table, chamadas Stripe/SQL a partir deste markdown.
