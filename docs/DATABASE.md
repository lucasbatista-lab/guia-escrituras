# Database — Amém Chat

Migrations em `supabase/migrations/`.

## Estado remoto confirmado (inspeção read-only)

- Aplicadas: `001`, `002`, `003`
- **Não aplicada:** `004_production_hardening` (preparada localmente)
- 20 tabelas públicas; RLS habilitado; `supabase db lint` limpo

## Arquivos

1. `20260712000001_foundation_schema.sql` — schema + RLS (não alterar)  
2. `20260712000002_seed_catalog.sql` — catálogo (não alterar)  
3. `20260712000003_daily_report_fn.sql` — agregados (não alterar)  
4. `20260712000004_production_hardening.sql` — hardening (aplicar manualmente depois)

## Migration 004 (resumo)

- Remove insert autenticado em `usage_events`; unique `(user_id, request_id)`
- Messages: authenticated só `role=user` + ownership da conversation
- Summaries: sem insert/update autenticado
- `handle_new_user` / `compute_daily_report_aggregates`: `search_path`, revoke EXECUTE amplo
- Unique parcial Stripe ids; remove plano `free` se existir

## Persistência na aplicação

Repositórios em `src/lib/database/repositories/`:

- Memory: apenas quando mocks permitidos e sem env público Supabase
- Supabase: quando `NEXT_PUBLIC_SUPABASE_*` presente

## Admin

Inserir em `admin_roles` via dashboard/SQL — ver `DEPLOYMENT.md`.
