# Handoff — Conversão e primeiro uso (2026-09-05)

## Estado atual

- Base produção reportada: `3081a29` (instrumentação first-party).
- Branch local `main` à frente de `origin/main` (sem push).
- Commits desta execução (mais recentes primeiro):

| SHA | Bloco | Resumo |
|-----|-------|--------|
| `45a14f4` | 4 (teste) | Ajuste authenticated-ux-polish para onboarding enxuto |
| `b962ded` | 4 | Personalização tradition-first |
| `da8b359` | 3 | Pós-pagamento activating + e-mail pendente |
| `67d6758` | 2 | Benefícios de planos + uso justo |
| `2747865` | 1 | Demo editorial interativa em `/comece` |
| `df605a3` | 0 prévio | Capa do vídeo `/comece` |
| `03672c3` | 0 prévio | Clareza da compra |

## Bloco 0 — consolidação

- Diffs de `03672c3` e `df605a3` revisados: fluxo conta → pagamento → e-mail libera acesso; etapas; preços; Particular; capa legível.
- Sem novo commit: fallback de `play()` já revela controles nativos; SVG no `poster` permanece como fallback.

## Decisões

1. Demo de `/comece` **substitui** o board estático Antes/Depois (mesmo âncora `#demonstracao`).
2. CTA da demo aponta para `/planos` (UTMs via TrackingLink); não usa hash (hash seria perdido pelo merge de query).
3. Uso justo: documentar interrupção / retorno / o que permanece, **sem** publicar orçamento BRL interno nem cotas de mensagens.
4. Pós-pagamento: estado `activating` quando Stripe indica pago e a assinatura ainda não está ativa no DB.
5. Onboarding: tradição obrigatória na tela; estilo/profundidade com defaults + `<details>`.
6. Medição (Bloco 5): **sem commit** — `product_demo_viewed` / `product_demo_topic_selected` + `paid_landing_demo_*` já cobrem a interação.

## Pendências / decisões comerciais

- Não declarar conversão/retenção/margem validadas (sem amostra suficiente de compradores novos).
- Smoke integrado pós-pagamento + e-mail real: pendente (exige ambiente autenticado; não executado nesta rodada).
- Possível evolução futura: medidor suave de uso na Conta (não implementado; orçamentos internos continuam fora da copy comercial).
- Dois commits de onboarding (`b962ded` + `45a14f4`) — o segundo só ajusta teste; não foi feito amend.

## Validação

| Ambiente | Status |
|----------|--------|
| Local (vitest direcionados + `launch:check` + `next build`) | Executado nesta sessão |
| Preview hospedado | Não publicado |
| Produção | Não publicado |

## Próxima ação sugerida

1. Revisar diffs localmente / em preview.
2. Publicar na ordem dos commits (ou squash consciente só se o dono pedir).
3. Após deploy: anotar data/SHA e observar funil first-party por UTM (landing → CTA → plano → cadastro) sem declarar vencedor prematuro.

## Publicação e rollback (não executados)

```bash
# Publicar
git push origin main

# Rollback de um commit específico (exemplo)
git revert <sha> --no-edit
git push origin main
```

Dependências: Bloco 1 (demo) independente de 2–4; Bloco 3 é billing/UI pós-compra; Bloco 4 é onboarding autenticado. Reverter 4 não afeta compra; reverter 1 não afeta billing.
