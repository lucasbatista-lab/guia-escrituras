# Database — Guia Escrituras

Migrations em `supabase/migrations/`. **Não aplicadas remotamente nesta execução.**

## Arquivos

1. `20260712000001_foundation_schema.sql` — schema, índices, triggers `updated_at`, RLS  
2. `20260712000002_seed_catalog.sql` — tradições, personas, planos, entitlements  
3. `20260712000003_daily_report_fn.sql` — função de agregados do relatório diário  

## Tabelas

| Tabela | Notas |
|--------|--------|
| `profiles` | 1:1 com `auth.users`; sem flag de admin |
| `spiritual_profiles` | tradição, estilo, profundidade, santos, onboarding |
| `traditions` / `tradition_policies` | catálogo extensível |
| `personas` / `persona_policies` | Jesus/Paulo ativos; Pedro inativo; Maria condicionada |
| `plans` / `plan_entitlements` | preços em **centavos** |
| `subscriptions` | status de pagamento não mutável pelo usuário |
| `conversations` / `messages` | mensagens sem update/delete para o usuário |
| `conversation_summaries` | memória estendida |
| `usage_events` | append-only |
| `usage_monthly` | agregados mensais |
| `referral_codes` / `referral_attributions` / `referral_rewards` | fluxo de indicação |
| `custom_content_orders` | plano Particular |
| `daily_reports` | só agregados; leitura admin |
| `admin_roles` | controle separado de admin |

## Índices

Criados para `user_id`, `subscription_id`, `conversation_id`, `created_at`, `referral_code` (e correlatos).

## RLS (resumo)

- Usuário acessa apenas os próprios dados  
- Catálogos públicos (`plans`, `personas` ativas) legíveis  
- Sem políticas de write em campos de billing para `authenticated`  
- `is_admin()` consulta `admin_roles`  

## Como aplicar (quando for o momento)

```bash
# Exemplo com Supabase CLI local — NÃO executar nesta fundação se remoto
supabase db push
# ou aplicar SQL manualmente no SQL Editor após revisão
```

Nunca commitar service role keys. O fluxo normal do usuário usa apenas a anon/publishable key.
