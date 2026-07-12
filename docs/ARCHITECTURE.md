# Architecture — Amém Chat (repo guia-escrituras)

## Visão geral

Produto público: **Amém Chat** — *Como Jesus responderia à sua situação?*  
Descrição: *Seu guIA cristão, baseado nas Escrituras.*  
Repositório interno: `guia-escrituras`.

Stack: Next.js App Router, TypeScript estrito, Tailwind, Supabase Auth + Postgres (`@supabase/ssr`), OpenAI Responses API (gateway), Zod, Vitest.

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
4. Validar orçamento mensal e burst diário  
5. Criar/localizar conversation  
6. Salvar mensagem do usuário (`role=user`)  
7. Gerar resposta via `AiProvider`  
8. Salvar assistant via backend confiável (secret key)  
9. Registrar `usage_events` (dedupe `user_id + request_id`)  
10. Atualizar `usage_monthly`  
11. Retornar JSON  

## Gateway de IA

- `OpenAiResponsesProvider` quando há `OPENAI_API_KEY`
- `MockAiProvider` apenas se `allowsMocks()` (development, ou preview com `DEMO_MODE=true`)
- Em production sem OpenAI: chat indisponível (503), sem fingir resposta

## Entitlements e planos

Únicos planos: Essencial (R$38), Caminho (R$58), Profundo (R$188), Particular (R$988 — Solicitar acesso).  
Sem free / trial recorrente / chat anônimo real.

## RLS e secret key

- Fluxo normal do usuário: publishable/anon + cookies
- Secret key (`SUPABASE_SECRET_KEY`) só em módulos `server-only` para writes administrativas (assistant, usage, summaries) após migration 004
- Nunca logar chaves

## Runtime

| Ambiente | Mocks |
|----------|-------|
| development | permitidos |
| preview | só com `DEMO_MODE=true` |
| production | proibidos |

## O que ainda é mock

Métricas admin, relatório diário ilustrativo, trechos bíblicos de demonstração, Stripe, pagamento de indicações.
