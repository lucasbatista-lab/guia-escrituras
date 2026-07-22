# Registro de decisões — retenção de dados (Jurídico / Produto)

**Data:** 2026-07-22  
**Status:** decisões **abertas** — engenharia não fixa prazos legais.  
**Relacionados:** `AMEM_MANUAL_ACCOUNT_DELETION_AND_RETENTION_RUNBOOK_2026-07-22.md`, `docs/USER_DATA_PORTABILITY.md`, UG-12.

---

## Como usar

Cada linha precisa de dono (Jurídico / Produto / Finanças / Ops) e decisão explícita antes de automatizar exclusão ou purge.

| Área | Pergunta em aberto | Opções típicas (não prescritivas) | Dono sugerido | Bloqueia self-service delete? |
|------|--------------------|-----------------------------------|---------------|-------------------------------|
| Mensagens / conversas / summaries | Hard delete imediato vs soft-delete vs anonimizar conteúdo? | hard / soft N dias / anon | Jurídico + Produto | Sim |
| Usage events / monthly | Manter agregados de custo sem PII? | purge com profile / reter agregados | Produto + Ops | Parcial |
| Consentimentos legais | Prova de aceite sobrevive à exclusão da conta? | reter registro mínimo / apagar | **Jurídico** | Sim |
| Dados financeiros (Stripe + local) | Quanto tempo invoices/customer após cancelamento? | política fiscal BR + Stripe | **Jurídico + Finanças** | Sim |
| Logs (Vercel / app) | TTL aceitável; scrub sob DSAR? | TTL provedor / export ticket only | Ops + Jurídico | Não (já residual) |
| Backups | Janela em que delete “completo” não é garantido? | RPO/RTO + aviso ao titular | Ops + Jurídico | Sim (comunicação) |
| Crises (conteúdo / categorias logadas) | Tratar logs de crise com política especial? | retenção curta / acesso mínimo | Jurídico + Pastoral/Ops | Sim |
| Aquisição / `signup_intents` / cookies UTM | Purge após Auth delete ou manter funil anonimizado? | NULL user_id + purge job / keep | Produto + Jurídico | Parcial |
| Suporte (inbox e-mail) | Retenção de threads de privacidade? | política de mailbox | Ops + Jurídico | Sim (processo) |
| Journey progress | Apagar com conta (cascade) é suficiente? | cascade ok / export-only | Produto | Não |
| Referrals | Anonimizar attributions que citam terceiros? | delete edges / hash | Produto + Jurídico | Parcial |
| Admin roles / audit | Precisa trilha de “quem apagou”? | ticket only / tabela futura | Ops + Jurídico | Pós |

---

## Decisões já tomadas pela engenharia (não jurídicas)

| Tema | Decisão engenharia |
|------|-------------------|
| Self-service delete | **Ausente** até design jurídico/produto |
| Export | Disponível V1 — não substitui delete |
| Processo manual | Runbook `AMEM_MANUAL_ACCOUNT_DELETION_AND_RETENTION_RUNBOOK_2026-07-22.md` |
| Prazos LGPD em dias | **Não** codificados / **não** afirmados em docs de eng |

---

## Próximo passo humano

1. Jurídico preenche a coluna de retenção por área.  
2. Produto decide soft vs hard para mensagens.  
3. Finanças confirma política Stripe customer.  
4. Só então roadmap de self-service delete / job de purge (pós-lançamento).
