# Architecture — Guia Escrituras

## Visão geral

Plataforma web de orientação e reflexão baseada nas Escrituras. O conceito central — *“Como Jesus responderia à sua situação?”* — é respondido como **interpretação ancorada nos Evangelhos**, nunca como pretensa identidade divina.

Stack: Next.js App Router, TypeScript estrito, Tailwind, Supabase Auth + Postgres (`@supabase/ssr`), OpenAI Responses API (via gateway), Zod, Vitest.

## Fluxo de autenticação

1. Cadastro / login / recuperação de senha usam Supabase Auth com cookies SSR.
2. `proxy.ts` renova a sessão e protege rotas de plataforma (`/inicio`, `/conversar`, …) e admin.
3. Sem env de Supabase, a fundação opera em **modo demonstração** (navegação e chat mock).
4. Onboarding grava `spiritual_profiles` e é exigido antes do chat (exceto demo).
5. Admin é validado por `admin_roles` (tabela separada), **não** por campo editável em `profiles`.

## Fluxo do chat

`POST /api/chat`:

1. Autentica usuário  
2. Valida body (Zod) + safety de input  
3. Carrega perfil espiritual, plano e entitlements  
4. Verifica orçamento mensal e burst diário  
5. Recupera resumo / últimas mensagens (demo: memória em processo)  
6. Compõe `TheologyPolicy`  
7. Chama `AiProvider`  
8. Persiste pergunta/resposta (demo: in-memory)  
9. Registra usage (tokens, custo estimado, latência)  
10. Retorna JSON estruturado  

**Streaming:** adiado de propósito nesta fatia para não fragilizar a arquitetura. Próximo passo documentado em `NEXT_STEPS.md`.

## Por que existe um gateway de IA

- Isola o provedor (`OpenAiResponsesProvider` vs `MockAiProvider`)
- Mantém a chave só no servidor
- Padroniza entrada/saída (`answer`, referências, aviso de interpretação, usage)
- Permite trocar modelo via env (`OPENAI_MODEL_DEFAULT`, `OPENAI_MODEL_DEEP`) sem tocar na UI

## Por que planos usam entitlements

Benefícios não são ifs espalhados na UI. Cada plano libera chaves (`chat_deep`, `extended_memory`, …). A UI lê `PLAN_DEFINITIONS` / resolução de entitlements. Isso facilita A/B, overrides e o plano Particular (“Solicitar acesso”) sem checkout.

## Como o RLS protege dados

- RLS ativo em tabelas com dados de usuário
- Políticas “own row” via `auth.uid()`
- `subscriptions` / status de pagamento: usuários só leem; escrita via service role
- `usage_events`: append-only para usuários comuns
- Admin separado em `admin_roles`
- Service role **nunca** no cliente

## Como custos são registrados

Cálculo **determinístico** a partir de tokens × taxas de planejamento × `USD_BRL_PLANNING_RATE`. A IA não calcula custo. Campos: `input_tokens`, `output_tokens`, `model`, `estimated_cost_usd_micros`, `estimated_cost_brl_cents`, `feature_type`, `request_id`, `latency_ms`, `success`.

## Como a tradição altera a resposta

`TheologyPolicyResolver` compõe:

1. Regras gerais da plataforma  
2. Política da tradição (`ecumenical` | `evangelical` | `catholic`)  
3. Política da persona  
4. Preferências do usuário  

Ex.: tradição evangélica bloqueia conteúdo de santos mesmo se o flag do usuário estiver ligado.

## O que ainda é mock

- `MockAiProvider` sem `OPENAI_API_KEY`
- Fonte bíblica mock (trechos fictícios rotulados “demonstração”)
- Persistência de chat em memória no modo demo
- Métricas do admin e relatório diário com agregados mock
- Stripe / checkout real
- Pagamento de recompensas de indicação
