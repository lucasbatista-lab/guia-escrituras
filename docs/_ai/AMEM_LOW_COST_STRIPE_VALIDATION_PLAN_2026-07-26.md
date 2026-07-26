# Validação Stripe low-cost (cupons / test mode)

**Data:** 2026-07-26  
**Escopo:** procedimento humano apenas  
**Preços imutáveis:** R$38 / R$58 / R$188  
**Nesta execução:** **não** criar cupons remotamente · **não** alterar Stripe · **não** criar prices · **não** executar pagamento live

---

## 1. Estado do código (EVIDÊNCIA)

| Item | Achado |
|------|--------|
| `allow_promotion_codes: true` | Já em `src/lib/stripe/checkout.ts` |
| Separação test/live | `sk_test_` / `sk_live_` via `key-mode` |
| Criação remota de cupom nesta execução | **Proibida** |

Checkout já aceita códigos de promoção no Stripe Checkout quando o operador cria o cupom no Dashboard.

---

## 2. Duas rotas

| Rota | Modo | Custo esperado | Segurança técnica | Preferência |
|------|------|----------------|-------------------|-------------|
| **A** | Stripe **test mode** | **R$ 0** | Alta — sem dinheiro real | **Preferida** |
| **B** | Live + cupom restrito ~R$5 once-only | ~R$5 | Média — risco de renovação / mau uso | Só se A impossível |

**Classificação:** ROTA A é tecnicamente mais segura.

---

## 3. ROTA A — Test mode (procedimento humano)

1. Confirmar `STRIPE_SECRET_KEY` = `sk_test_…` no ambiente usado para o smoke.
2. No Dashboard Stripe (**Test mode**): Products/Prices espelhando Essencial/Caminho/Profundo (IDs de teste).
3. Criar Promotion Code de teste (100% off ou valor alto de desconto) — **manual no Dashboard**.
4. Fluxo: cadastro → `/planos` → Checkout → inserir código → completar com cartão de teste Stripe.
5. Validar webhook test → assinatura `active`/`trialing` → entitlements no app.
6. Cancelar renovação / limpar fixture de teste.
7. **Não** misturar objects test com live.

Evidências a guardar: session id, subscription id, print do admin (sem PII extra), outcome webhook.

---

## 4. ROTA B — Live cupom ~R$5 (somente se necessário)

| Controle | Obrigatório |
|----------|-------------|
| Cupom **once** / duração limitada | Sim |
| Código não público (não Instagram) | Sim |
| Redeem limit baixo (ex.: 1–3) | Sim |
| Monitorar 1ª renovação | Sim — risco de cobrança cheia no ciclo seguinte |
| Cartão real do operador | Sim |
| Cleanup: cancelar renovação imediatamente após smoke | Sim |

**Riscos:** renovação full-price; código vazado; confusão test/live price IDs; chargeback improvável mas possível.

---

## 5. O que não fazer nesta execução

- Criar/editar cupons via API/agent  
- Mudar preços canônicos  
- Habilitar plan change  
- Assumir que cupom live = “validação completa de produção” sem webhook + Conta + cancelamento

---

## 6. Critérios de aceite (smoke)

| Check | A | B |
|-------|---|---|
| Checkout aceita código | ✓ | ✓ |
| Webhook processa sem duplicar | ✓ | ✓ |
| Entitlement correto no app | ✓ | ✓ |
| Custo ≈ 0 / ≈ 5 | ✓ | ✓ |
| Cancelamento de renovação ok | ✓ | ✓ |
| Sem alteração de price ids canônicos | ✓ | ✓ |
