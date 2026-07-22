# Chargeback and Payment Dispute Playbook — Amém Chat

**Data:** 2026-07-22
**Finding:** UG-07 · relacionado MAE-P0-02
**Escopo:** operação humana. **Não** há automação de dispute no código atual.

Não enviar conteúdo espiritual, mensagens de chat, Jornadas pessoais ou texto pastoral ao Stripe.

---

## 1. Alerta recebido

Fontes típicas: e-mail Stripe, Dashboard Disputes, usuário reclamando na fatura do cartão, suporte Amém.

**Primeira ação:** abrir dispute no Dashboard (test ou live conforme ambiente); **não** apagar customer/subscription locais.

## 2. Identificação do pagamento

Registrar (ticket interno):

- Stripe `dispute.id`, `charge.id`, `payment_intent` / `invoice`
- `customer` id
- userId interno (via `billing_customers` / metadata) — **não** colar e-mail em canais públicos
- planKey aparente
- timestamps

## 3. Preservação de evidências

- Screenshot/export do dispute reason
- Últimos eventos webhook relacionados (ids, não payloads com PII desnecessária)
- Estado da assinatura no app (status, period_end)
- **Não** exportar histórico de chat para o Stripe

## 4. Conteúdo que nunca deve ir ao Stripe

- Texto de mensagens / reflexões
- Respostas de crise
- Conteúdo de Jornadas pessoais
- Conversas pastorais
- Dados de saúde mental
- Logs com corpo de mensagem

## 5. Dados permitidos (mínimo)

- Evidência de compra (receipt, invoice PDF Stripe)
- Timestamps de signup/checkout
- Confirmação de que a conta usou o serviço (agregado: “usou chat N vezes”) **sem** conteúdo
- Políticas públicas de cancelamento / termos (links)

## 6. Entitlement durante disputa

Política operacional sugerida (decisão Fin/Ops — ajustar se jurídico definir outra):

- Manter acesso até decisão **se** risco de fraude baixo e usuário comunica boa-fé
- Se fraude clara / conta comprometida: suspender entitlement manualmente (processo admin) e documentar
- Código atual **não** auto-revoga em dispute — ação humana

## 7. Refund versus dispute

| Caminho | Quando | Efeito |
|---------|--------|--------|
| Refund voluntário | Usuário pede reembolso antes/fora dispute; boa-fé | Preferível a chargeback; alinhar cancelamento |
| Dispute / chargeback | Banco do usuário abriu | Responder no prazo Stripe; evidências mínimas |

Não prometer refund automático pelo produto.

## 8. Chargeback confirmado (lost)

1. Registrar perda financeira
2. Garantir assinatura local `canceled` / sem entitlement
3. Avaliar bloqueio de novo checkout do mesmo customer (manual)
4. Revisar se houve abuso sistemático

## 9. Usuário legítimo

- Oferecer cancelamento + orientação portal
- Considerar refund parcial/total conforme política comercial (humano)
- Não discutir teologia no ticket de cobrança

## 10. Fraude provável

- Não reembolsar às cegas se evidência de abuso
- Escalar Fin + Ops
- Preservar logs de auth/IP agregados se disponíveis (sem conteúdo espiritual)

## 11. Conta comprometida

- Forçar reset de senha / invalidar sessões (Supabase Auth)
- Rotacionar se houver suspeita de session theft
- Ver matriz de acessos / secrets

## 12. Duplicidade de cobrança

- Confirmar no Stripe quantas invoices/charges
- Se double charge app-side: refund da duplicata + corrigir sub
- Interromper smoke/lançamento se sistêmico

## 13. Contato com usuário

Tom: factual, sem culpa religiosa. Canais: e-mail suporte configurado. WhatsApp **não** é atendimento pastoral nem disputa financeira profunda.

## 14. Atualização local

- Sync via webhook preferencial; se falhar, ajuste manual documentado
- Não editar prices
- Não “consertar” proration

## 15. Reconciliação

Ao fechar o caso: dispute status final, refund ids, planKey final, ticket id. Receita admin pode permanecer `null` (não usar como ledger).

## 16. Escalonamento

| Papel | Responsabilidade |
|-------|------------------|
| Ops | triagem, evidências, entitlement |
| Fin | refund/dispute response, perda |
| Jurídico | casos sensíveis / LGPD / contestação |
| Eng | só se bug de webhook/binding |

## 17. Não apagar evidências prematuramente

Manter artefatos do ticket até prazo fiscal/jurídico definido pelo negócio (a confirmar). Não limpar `payment_events` para “esconder” dispute.

## 18. Relacionados

- Smoke: `AMEM_FINANCIAL_SMOKE_PREPARATION_2026-07-20.md`
- Cutover: `PRODUCTION_CUTOVER_RUNBOOK.md`
- Honesty planos: `COMMERCIAL_PLANS.md`
