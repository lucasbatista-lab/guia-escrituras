# Operator Access and Secret Rotation Matrix — Amém Chat

**Data:** 2026-07-22
**Findings:** UG-18 · UG-02 · MAE-P1-10

Valores de secrets **nunca** neste documento. Proprietários atuais: **a confirmar** onde não houver evidência no repo.

| Sistema | Proprietário | Operadores mín. | Papel | Nível | MFA | Conta | Recuperação | Rotação | Offboarding | Emergência | Segredo (tipo) |
|---------|--------------|-----------------|-------|-------|-----|-------|-------------|---------|-------------|------------|----------------|
| GitHub | a confirmar | 1–2 | admin repo | write/admin | a confirmar | a confirmar (pessoal/org) | recover codes | tokens PAT | remover collaborator | outro admin | deploy keys/PAT |
| Vercel | a confirmar | 1–2 | project | env+deploy | a confirmar | a confirmar | org recovery | env rotate+redeploy | remove member | bypass deploy | env vars |
| Supabase | a confirmar | 1–2 | project | dashboard+SQL | a confirmar | a confirmar | owner email | service/secret keys | remove member | service role rotate | SUPABASE_SECRET_KEY |
| Stripe | a confirmar | 1 Fin+Ops | restricted keys | live/test sep. | a confirmar | a confirmar | Stripe support | sk/whsec | remove user | restrict keys | STRIPE_* |
| OpenAI | a confirmar | 1 | API | billing+key | a confirmar | a confirmar | org | API key | revoke key | kill chat | OPENAI_API_KEY |
| DNS/domínio | a confirmar | 1 | DNS | zone | a confirmar | a confirmar | registrar | — | transfer lock | alternate contact | registrar login |
| E-mail (SMTP/Resend) | a confirmar | 1 | send | API | a confirmar | a confirmar | provider | API key | revoke | — | SMTP keys |
| Instagram | a confirmar | 1 | social | page | a confirmar | @amem.chat | Meta recovery | — | remove | — | — |
| WhatsApp comercial | a confirmar | 1 | biz | **não pastoral** | a confirmar | a confirmar | — | — | — | script honesty | — |
| Suporte e-mail | a confirmar | 1+ | inbox | SUPPORT_EMAIL | a confirmar | a confirmar | — | — | — | — | — |

## Rotação de secrets (procedimento)

1. Gerar novo secret no provedor
2. Atualizar Vercel (Production; Preview se aplicável)
3. Redeploy
4. Validar health + um fluxo afetado (chat/webhook/cron)
5. Revogar secret antigo
6. Registrar ticket (quem/quando/qual secret — **sem valor**)
7. Se falha: rollback env + redeploy

## Suspeita de vazamento

1. Revogar imediatamente
2. Rotacionar correlatos (service role, Stripe, OpenAI, CRON)
3. Auditar admin_roles e deploys recentes
4. Kill switches se abuso de IA
5. Jurídico se PII envolvida

## DEMO_MODE / preview

Nunca `DEMO_MODE=true` com dados reais. Demo admin (`isAdmin: true` com mocks) só em preview controlado.
