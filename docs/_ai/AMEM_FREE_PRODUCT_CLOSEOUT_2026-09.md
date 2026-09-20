# Amém FREE — closeout operacional (2026-09-20)

## HEAD

- Inicial (sprint anterior): `3083e9ebc169b11cc363fa0774ae1a732a37145e`
- Produção ao iniciar esta rodada: `ede425e0a34e4c072e3ac5837a97c1b07ae3cc14`
- Closeout:
  - `d3ff010` fix(product): close free production rollout
  - `8e90ee0` fix(ux): align public entry and mobile consent
  - `106036f` feat(content): add safe daily editorial pipeline
  - analytics commit empilhado em seguida

## Migrations (produção)

Mecanismo: `npx supabase db query --linked --file <migration.sql>` + `npx supabase migration repair <version> --status applied --linked --yes`.

Não usar `db push` (008–012 local-not-remote).

| Migration | Status live |
|---|---|
| `20260920000014_user_daily_interactions_and_product_events.sql` | aplicada + repair `applied` |
| `20260920000015_personal_spiritual_workspace.sql` | aplicada + repair `applied` |

Tabelas com RLS: `user_daily_interactions`, `product_events`, `user_prayers`, `user_saved_items`, `user_private_entries`.

## Produção / smoke

- `/api/health` no início: `version=ede425e`, `runtime=production`.
- Público LIVE VERIFIED (antes do push desta rodada): superfície no ar; migrations 014/015 no banco.
- Fluxo autenticado FREE (cadastro → confirmar e-mail → Hoje → check-in → salvar → compartilhar → espaço → paywall de chat): **TEST VERIFIED ONLY** (confirmação de e-mail; sem inventar credencial).
- Pago: sem checkout real nesta rodada; regressão coberta por testes de entitlements/Stripe.

## UX

- CTA visitante: “Criar conta grátis” (não é trial).
- Cadastro sem `?plan=`: sem cartão; progresso Conta → Confirmar e-mail → Hoje com Deus.
- Cadastro com `?plan=`: jornada paga intacta.
- Cookie banner: 3 colunas Aceitar / Recusar / Configurar; copy curta + Saiba mais; safe-area iOS.
- Contraste do hero: `text-ink`.
- `/comece` permanece fora do sitemap (landing de campanha paga, `noindex`).
- “Conversar sobre isso” no FREE: painel curto, sem countdown/culpa; Hoje continua completo.

## Pipeline editorial

```text
pnpm content:daily:validate --file <path>
pnpm content:daily:import --file <path> --dry-run
pnpm content:daily:import --file <path>
pnpm content:daily:coverage
```

Catálogo: `src/lib/daily/editorial/imported.json` (upsert por `publish_date`).
`scripture_text` não vazio é rejeitado (allowlist jurídica vazia). Seed QA cobre Hoje se o catálogo datado estiver vazio.

## Funil FREE / D1

- Admin: `/admin/ativacao` (secção Funil FREE).
- CLI: `pnpm report:free-funnel` (precisa `SUPABASE_URL` + `SUPABASE_SECRET_KEY`; só contagens).
- D1: derivado de `user_daily_interactions` viewed/completed/saved em `America/Sao_Paulo`; coorte N → retorno N+1; **não** usa check-in nem texto privado.
- Assinatura continua em Aquisição/Stripe — não duplicada no funil de eventos.

## Privacidade

`product_events` só `event_name` + `path`. Funil não seleciona `body`/`checkin`. Workspace (orações/diário) não entra no chat/LLM.

## Brand / config

`.env.example`, README e ARCHITECTURE: tagline sem personificar Jesus. Modelos documentados = runtime (`gpt-4.1-mini` / `gpt-4.1`). Env de produção não alterado.

## Testes (pré-push)

- Vitest: 1265 verdes
- `eval:theology:ci`: verde
- `eslint src tests`: único aviso novo desta rodada removido; ruído preexistente em evals (`eslint-disable` unused) e `eslint .` em `.tmp-runtime-closure/`
- `pnpm build`: verde

## Pendências / P1

- Catálogo editorial real (0 dias importados; seed impede Hoje vazio).
- Smoke autenticado LIVE após confirmação de e-mail real.
- Banner de cookies: revalidar viewport iPhone após deploy.
- Não iniciado (intencional): Bible Reader, App Store, IAP, push, LLM no FREE.
