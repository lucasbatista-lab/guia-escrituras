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
| `META_GRAPH_API_VERSION` | Server only | Sim — use a **current** Graph API version from Meta docs at setup time; **never guess in code** |
| `META_CAPI_TEST_EVENT_CODE` | Server only | Não (somente teste) |

Sem essas variáveis, Pixel e CAPI permanecem desabilitados com segurança. A landing e o checkout continuam funcionando.

**`META_ADS_ENABLED`:** mantenha `false` (ou unset) até concluir Test Events no Events Manager. Só então ligue `true` conscientemente.

## CSP (browser)

Permitidos de forma mínima em `next.config.ts` (consentimento continua mandatório):

| Diretiva | Hosts |
|---|---|
| `script-src` | `https://connect.facebook.net` (`fbevents.js` + `/signals/config`) |
| `connect-src` | `https://www.facebook.com`, `https://connect.facebook.net` |
| `img-src` | `https://www.facebook.com` (beacon `/tr`) |
| `media-src` | `'self'`, `https://*.public.blob.vercel-storage.com` (VSL no Vercel Blob) |

CAPI server → `graph.facebook.com` **não** depende desta CSP. Sem consentimento de publicidade o Pixel **não** carrega mesmo com CSP aberta.

## Configurar Pixel / Dataset

1. No Events Manager da Meta, crie (ou use) um Pixel/Dataset.
2. Copie o Pixel ID para `NEXT_PUBLIC_META_PIXEL_ID`.
3. Gere um token da Conversions API e coloque em `META_CAPI_ACCESS_TOKEN` (somente server/Vercel encrypted env).
4. Defina `META_GRAPH_API_VERSION` com a versão Graph documentada no momento (não invente).
5. Defina `META_ADS_ENABLED=true` só quando for validar ou operar (após Test Events).

## Consentimento

- Banner não bloqueante; recusar é tão fácil quanto aceitar.
- Publicidade começa **desligada**.
- Pixel/scripts Meta só após opt-in.
- Preferências: `/cookies` (“Alterar preferências de cookies”).
- Revogar remove `_fbp`/`_fbc` quando o domínio conseguir; **não** remove `amem_acq_first` / `amem_acq_last`.

## Eventos ativos nesta versão

| Evento | Canal | Quando |
|---|---|---|
| `PageView` | Browser | Superfícies allowlist após consentimento |
| `ViewContent` | Browser | `/comece` após consentimento |
| `InitiateCheckout` | CAPI | Após criar Stripe Checkout Session |
| `Purchase` | CAPI | Após `checkout.session.completed` processado |

### Lead desabilitado

**Lead browser está desabilitado.** Motivo: o cadastro pode retornar `ok: true` em soft-success (e-mail já existente / enumeração-safe). Disparar Lead após qualquer `ok` gerava Lead sem conta nova.

Reintrodução futura exige evento **autoritativo e idempotente** que não permita confundir conta nova com duplicata e que não exponha enumeração ao client.

**Não otimize a campanha inicial para Lead.** Prefira Landing Page Views / cliques ou Purchase quando houver volume.

Eventos first-party (`signup_started`, `paid_landing_*`, etc.) continuam independentes da Meta.
Eles passam por `POST /api/acquisition/events` e, após a migration `013`, também persistem em
`public_conversion_events` (sem e-mail, conversa, tokens ou URL completa). Detalhes, gaps de
medição e relatório BRT: `docs/ACQUISITION_EVENTS.md`.

## Validar browser (PageView / ViewContent)

1. Aceite publicidade em `/comece`.
2. Events Manager → Test Events (browser):
   - `PageView` em `/comece`, `/planos`, `/cadastro`
   - `ViewContent` em `/comece`
3. Confirme ausência de Lead após cadastro ou soft-success.
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

## Vídeo da landing

- Opcional: `NEXT_PUBLIC_PAID_LANDING_VIDEO_URL` (HTTPS absoluto; preferir Vercel Blob public)
- Sem URL: poster/produto estático fiel
- Com URL: `<video>` nativo, play explícito, `preload=metadata`, sem autoplay com áudio
- Poster: `/marketing/comece-poster.svg`
- Slot reservado 9:16 com `object-contain` (não corta 9:16 nem 4:5)
- Não versionar o MP4 no Git/`public`
- **P2 (não nesta versão):** first-party `paid_landing_vsl_play` / quartis / complete — sem envio à Meta

## Deduplicação / idempotência

- Nesta versão não há espelho browser de Purchase.
- Retries do webhook reutilizam o mesmo `event.id` → mesmo `event_id` CAPI.
- `payment_events` continua sendo ledger financeiro, não ledger Meta.

## Desligar Meta rapidamente (rollback)

1. `META_ADS_ENABLED=false` (ou remova) e redeploy/restart.
2. Remova/esvazie `META_CAPI_ACCESS_TOKEN` e/ou `NEXT_PUBLIC_META_PIXEL_ID` se necessário.
3. Com Pixel ID ausente, o browser fica silencioso; com Graph/token ausentes, CAPI fica `disabled`.

## Dados que a Meta pode receber (com consentimento)

- `event_name`, `event_id`, `event_time`, `event_source_url`, `action_source`
- `value`, `currency` (quando aplicável)
- `_fbp`, `_fbc` quando existirem
- `em` (e-mail normalizado + SHA-256 hex lowercase, nunca plaintext)
- `external_id` (UUID interno do usuário + SHA-256 hex lowercase)
- `client_ip_address` (IP do comprador no momento do checkout, não hasheado)
- `client_user_agent` (User-Agent do comprador no checkout, não hasheado)

IP e User-Agent são capturados na criação da Stripe Checkout Session e repassados via metadata (`meta_client_ip`, `meta_client_ua`) para o Purchase no webhook — nunca o IP/UA do request do webhook Stripe.

## Dados que nunca são enviados

- e-mail / telefone em plaintext
- plano, tradição religiosa, conteúdo de conversa
- situação pessoal, emoção, crise, mensagem, prompt
- versão bíblica, perfil espiritual
- UTMs com PII na `event_source_url` (query/hash são removidos)

## Dataset Quality API (P2 — pós-lançamento)

A Dataset Quality API da Meta é útil para diagnóstico operacional de Event Match Quality (EMQ), mas **não é requisito** para enviar conversões nem sinal direto adicional para otimização. Não implementada nesta versão. Avaliar após Test Events e primeiras campanhas.

## Checklist visual (antes de ativar)

- [ ] Mobile 320/390: CTA “Ver planos” visível e não coberto pelo consentimento
- [ ] Produto/mídia começa na primeira dobra
- [ ] Caminho é o primeiro plano completo no mobile
- [ ] Sticky some em `#planos` e com banner aberto
- [ ] Sem “Começar agora” ambíguo que só rola a página

## Checklist antes de anúncios

- [ ] Consentimento e `/cookies` revisados
- [ ] Pixel ID + CAPI token + Graph version configurados
- [ ] Test Events: PageView, ViewContent (sem Lead)
- [ ] Confirmar ausência de Lead no browser após cadastro / soft-success
- [ ] Não otimizar campanha inicial para Lead
- [ ] InitiateCheckout após sessão Stripe real
- [ ] Purchase só via webhook confirmado (com autorização do operador)
- [ ] Sem Meta env: landing/consentimento OK e zero requests Meta
- [ ] Admin, conversas e Jornadas sem Pixel
- [ ] Vídeo da landing: opcional via `NEXT_PUBLIC_PAID_LANDING_VIDEO_URL`
- [ ] Checkpoint visual mobile 320/390 antes de ativar anúncios
- [ ] Meta continua desligada até configuração manual consciente
