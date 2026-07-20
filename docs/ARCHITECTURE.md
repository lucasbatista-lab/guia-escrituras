# Architecture — Amém Chat (repo guia-escrituras)

## Visão geral

Produto público: **Amém Chat** — *Como Jesus responderia à sua situação?*  
Descrição: *Seu guIA cristão, baseado nas Escrituras.*  
Repositório interno: `guia-escrituras`.

Stack: Next.js App Router, TypeScript estrito, Tailwind, Supabase Auth + Postgres (`@supabase/ssr`), OpenAI Responses API (gateway), Stripe (checkout/webhooks), Zod, Vitest.

## Fluxo de autenticação

1. Cadastro / login / recuperação usam Supabase Auth com cookies SSR (sem localStorage).
2. `proxy.ts` renova sessão e protege rotas platform/admin.
3. Onboarding grava `spiritual_profiles`; `/conversar` exige `onboarding_completed`.
4. Admin somente via `admin_roles` (nunca campo em `profiles`).
5. Sem Supabase público: em development (mocks) há contexto demo; em production/preview sem `DEMO_MODE`, platform falha de forma segura.

## Fluxo do chat (persistido)

1. Autenticar  
2. Validar onboarding  
3. Validar assinatura ativa + entitlements (**sem plano gratuito**)  
4. Validar orçamento mensal, burst diário e rate limit técnico curto  
5. Criar/localizar conversation (histórico reabrível)  
6. Salvar mensagem do usuário (`role=user`)  
7. Gerar resposta via `AiProvider` (comum ou Profundo on-demand)  
8. Salvar assistant via backend confiável (secret key)  
9. Registrar `usage_events` (dedupe `user_id + request_id`)  
10. Atualizar `usage_monthly`  
11. Retornar JSON (idempotência / retry seguros)

## Gateway de IA

- `OpenAiResponsesProvider` quando há `OPENAI_API_KEY`
- `MockAiProvider` apenas se `allowsMocks()` (development, ou preview com `DEMO_MODE=true`)
- Em production sem OpenAI: chat indisponível (503), sem fingir resposta

## Entitlements e planos

Únicos planos: Essencial (R$38), Caminho (R$58), Profundo (R$188), Particular (R$988 — Solicitar acesso).  
Sem free / trial recorrente / chat anônimo real.  
Checkout Stripe real no código; prevenção de assinatura duplicada; cancelamento/reativação nativos.

**Runtime ativo:** `chat_standard`, `chat_deep`. Demais flags no catálogo são reservadas (ver `docs/COMMERCIAL_PLANS.md`).  
**Upsell V1:** diferenciação comercial + upsells contextuais éticos — sem troca de plano, sem alteração de preço/budget.

## Admin e operações

- Lista/detalhe/CSV de assinantes (sem conteúdo de conversa)
- Métricas e alertas operacionais a partir de dados reais agregados (não mock)
- Relatório diário UTC via cron (`CRON_SECRET`) + geração manual admin — ver `docs/DAILY_REPORTS.md`

## SEO / social

- Canonical apex `https://amemchat.com.br`
- OG/Twitter metadata em páginas públicas
- `robots.ts` / `sitemap.ts`; rotas privadas com noindex

## RLS e secret key

- Fluxo normal do usuário: publishable/anon + cookies
- Secret key (`SUPABASE_SECRET_KEY`) só em módulos `server-only` para writes administrativas (assistant, usage, summaries, cron)
- Endurecimento adicional na migration **004** (ainda não aplicada no cutover)
- Nunca logar chaves; health não expõe presença de secrets

## Runtime

| Ambiente | Mocks |
|----------|-------|
| development | permitidos |
| preview | só com `DEMO_MODE=true` |
| production | proibidos |

## Indicação e compartilhamento orgânico

- Links de share usam `utm_source=share` (+ `organic_user` para visitante ou `user` + `ref` para autenticado).
- O mesmo `referral_code` entra em `referral_attributions`; autoindicação e `referred_user_id` unique já bloqueiam abuso.
- Compartilhar **não** implica recompensa financeira. Elegibilidade futura (se publicada) reutiliza os códigos atuais; partner/affiliate devem manter `utm_medium` distinto (ex.: `commercial`).

## O que ainda é limitado / futuro

Trechos bíblicos de demonstração; receita em dinheiro no daily report (`null`); falhas HTTP do chat só em logs; pagamento de indicações; streaming; validação remota do cutover (DNS, Stripe live, e-mail real, cron real).
