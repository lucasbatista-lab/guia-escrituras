# Troca automática de plano — decision pack

**Data:** 2026-07-26  
**Status:** **sem implementação** · decisão humana pendente  
**Preços imutáveis:** R$38 / R$58 / R$188  
**Pré-condição:** smoke financeiro (preferir ROTA A test mode) antes de qualquer build

---

## 1. Estado atual (EVIDÊNCIA)

| Área | Estado |
|------|--------|
| Checkout novo | Implementado |
| Cancelar renovação / portal (reativação conforme código) | Parcial — sem plan change |
| `subscription.items` update / proration | **Ausente** |
| Copy pública | “troca automática … ainda não está disponível” |
| Webhook `customer.subscription.updated` | Existe — não assume plan-change UX |

---

## 2. Opções (matriz)

| Opção | Descrição | Acesso novo | Dinheiro | Downgrade | Complexidade | Risco $ |
|-------|-----------|-------------|----------|-----------|--------------|---------|
| **A** | Upgrade imediato + cobrança **proporcional** (proration) | Imediato | Proration Stripe | Definir à parte | Alta | Médio (invoices parciais) |
| **B** | Upgrade imediato cobrando **diferença integral** (sem proration “justa”) | Imediato | Valor cheio / regra custom | Confuso p/ user | Alta | Alto (percepção unfair) |
| **C** | Mudança **somente na renovação** | Próximo ciclo | Preço novo no renew | Simétrico | Média | Baixo |
| **D** | **Upgrade imediato** + **downgrade na renovação** | Up já / down depois | Proration no up | Protege receita | Média–alta | Médio |
| **E** | **Customer Portal** Stripe (config remota) | Conforme portal | Conforme portal | Conforme portal | Baixa eng / média ops | Médio (menos controle UX) |
| **F** | Fluxo **próprio** no Amém Chat | Total controle | Total controle | Total controle | Mais alta | Depende das regras |

---

## 3. Recomendação técnica padrão

**Default sugerido: D ou E.**

| Preferência | Quando |
|-------------|--------|
| **D** | Querer UX Amém + regra clara “sobe já, desce no fim do ciclo” |
| **E** | Querer menor código local e aceitar UX Stripe Portal + mapear webhooks |

**Não** recomendar B como padrão (percepção de cobrança injusta).  
**A** só com copy explícita de proration e testes de invoice.  
**C** é a mais simples, mas atrasa valor de upgrade.  
**F** só após D/E estabilizados.

---

## 4. Decisões humanas obrigatórias (antes de implementar)

| # | Decisão | Opções típicas |
|---|---------|----------------|
| 1 | Quando o novo acesso entra em vigor? | Imediato / renovação |
| 2 | Quando o dinheiro é cobrado? | Agora (proration) / renovação / diferença cheia |
| 3 | Política de downgrade | Imediato / fim do ciclo / bloqueado |
| 4 | Falha de pagamento no upgrade | Manter plano antigo / `past_due` / retry |
| 5 | Cupom ativo na troca | Remover / manter / recalcular |
| 6 | `cancel_at_period_end` + troca | Bloquear troca / limpar flag / só suporte |
| 7 | Comunicação ao usuário | Copy Conta + e-mail + `/cancelamento` |
| 8 | Portal vs API própria | E vs D/F |

---

## 5. Riscos transversais (investigar na implementação futura)

`past_due` · pending updates · webhook fora de ordem · idempotência · duplicação de subscription · price test vs live · Particular sem checkout · entitlement sync · créditos/unused time · invoice de upgrade falha

---

## 6. Customer Portal (se escolher E)

Documentar **antes** de ligar remotamente:

1. Products/prices permitidos no portal  
2. Proration behavior no Dashboard  
3. Impacto em `customer.subscription.updated` / invoices  
4. Copy no app alinhada ao que o portal faz  
5. Teste em **test mode** completo  

**Nesta execução:** não alterar configuração remota do portal.

---

## 7. Lançamento 28/07

Plan change = **P1 decisão**, **não** implementar na janela de lançamento salvo GO explícito pós-smoke.
