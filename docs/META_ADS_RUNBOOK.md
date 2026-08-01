# Meta Ads — runbook operacional (Amém Chat)

Timezone operacional: `America/Sao_Paulo`.  
Produção: `https://amemchat.com.br`.  
Landing paga: `/comece` (pública, `noindex`, fora do sitemap).

## Variáveis

| Variável | Onde | Obrigatória para ligar? |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Browser + server | Sim (dígitos) |
| `NEXT_PUBLIC_PAID_LANDING_VIDEO_URL` | Browser | Não |
| `META_ADS_ENABLED` | Server | Sim (`true`/`1`/`yes`/`on`) |
| `META_CAPI_ACCESS_TOKEN` | Server only | Sim |
| `META_GRAPH_API_VERSION` | Server only | Sim (ex.: `v21.0`) — **não adivinhar** |
| `META_CAPI_TEST_EVENT_CODE` | Server only | Não (somente teste) |

Sem essas variáveis, Pixel e CAPI permanecem desabilitados com segurança. A landing e o checkout continuam funcionando.

## Configurar Pixel / Dataset

1. No Events Manager da Meta, crie (ou use) um Pixel/Dataset.
2. Copie o Pixel ID para `NEXT_PUBLIC_META_PIXEL_ID`.
3. Gere um token da Conversions API e coloque em `META_CAPI_ACCESS_TOKEN` (somente server/Vercel encrypted env).
4. Defina `META_GRAPH_API_VERSION` com a versão Graph documentada no momento (não invente).
5. Defina `META_ADS_ENABLED=true` só quando for validar ou operar.

## Consentimento

- Banner não bloqueante; recusar é tão fácil quanto aceitar.
- Publicidade começa **desligada**.
- Pixel/scripts Meta só após opt-in.
- Preferências: `/cookies` (“Alterar preferências de cookies”).
- Revogar remove `_fbp`/`_fbc` quando o domínio conseguir; **não** remove `amem_acq_first` / `amem_acq_last`.

## Validar browser (PageView / ViewContent / Lead)

1. Aceite publicidade em `/comece`.
2. Events Manager → Test Events (browser):
   - `PageView` em `/comece`, `/planos`, `/cadastro`
   - `ViewContent` em `/comece`
3. Crie uma conta de teste: `Lead` só depois do cadastro bem-sucedido.
4. Recuse publicidade: nenhum request Meta novo.

## Validar InitiateCheckout (CAPI)

1. Com consentimento aceito e envs CAPI ativas, avance até criar a Stripe Checkout Session.
2. O evento `InitiateCheckout` só parte **depois** da sessão criada.
3. Sem consentimento: checkout segue normal, sem CAPI e sem metadata `_fbp`/`_fbc`.

## Validar Purchase (CAPI)

1. Purchase é **somente server-side**, após `checkout.session.completed` processado com sucesso.
2. `event_id` = Stripe `event.id` (idempotente em retries).
3. **Não** dispare Purchase em `/assinatura/sucesso`, clique, signup ou redirect.
4. Não teste Purchase real sem autorização explícita do operador.

## Deduplicação / idempotência

- Nesta versão não há espelho browser de Purchase.
- Retries do webhook reutilizam o mesmo `event.id` → mesmo `event_id` CAPI.
- `payment_events` continua sendo ledger financeiro, não ledger Meta.

## Desligar Meta rapidamente

1. `META_ADS_ENABLED=false` (ou remova) e redeploy/restart.
2. Remova/esvazie `META_CAPI_ACCESS_TOKEN` e/ou `NEXT_PUBLIC_META_PIXEL_ID` se necessário.
3. Com Pixel ID ausente, o browser fica silencioso; com Graph/token ausentes, CAPI fica `disabled`.

## Dados que a Meta pode receber (com consentimento)

- `event_name`, `event_id`, `event_time`, `event_source_url`, `action_source`
- `value`, `currency` (quando aplicável)
- `_fbp`, `_fbc` quando existirem

## Dados que nunca são enviados

- e-mail / telefone (nem hash) / advanced matching / `external_id`
- plano, tradição religiosa, conteúdo de conversa
- situação pessoal, emoção, crise, mensagem, prompt
- versão bíblica, perfil espiritual

## Checklist antes de anúncios

- [ ] Consentimento e `/cookies` revisados
- [ ] Pixel ID + CAPI token + Graph version configurados
- [ ] Test Events: PageView, ViewContent, Lead
- [ ] InitiateCheckout após sessão Stripe real
- [ ] Purchase só via webhook confirmado (com autorização do operador)
- [ ] Sem Meta env: landing/consentimento OK e zero requests Meta
- [ ] Admin, conversas e Jornadas sem Pixel
