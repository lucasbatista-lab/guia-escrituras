# First-party acquisition events (persistência)

Timezone operacional: `America/Sao_Paulo`.  
Endpoint: `POST /api/acquisition/events` (já existente; agora também grava em DB).

## O que é medido

Beacons first-party do funil público (`paid_landing_*`, `signup_started`, etc.):

| Campo persistido | Notas |
|------------------|-------|
| `event_id` | Idempotência; reenvio do mesmo id não duplica |
| `received_at` | Horário do servidor (UTC) |
| `event_name` | Allowlist fixa |
| `path` | Allowlist de caminhos de marketing/auth de funil |
| `viewport_class` | `mobile` / `tablet` / `desktop` |
| `utm_*` | source/medium/campaign/content sanitizados (sem query completa) |
| `session_key` | Opaco por **aba** (`sessionStorage`) — ver limitações abaixo |

**Não** persiste: e-mail, tokens, conteúdo de conversa, URL completa, `fbclid`, IP, User-Agent, `plan` (aceito no POST só para log estruturado).

### Resposta HTTP

- Sempre `202` + `{ ok: true, persist: { stored, duplicate, reason } }` quando o payload é válido.
- **`202` sozinho não prova gravação.** Confira `persist.stored === true` ou a linha no Postgres.
- `persist.reason` exemplos: `admin_client_unavailable`, `insert_error`, `path_not_allowed`.
- Ausência de `SUPABASE_SECRET_KEY` / URL → `stored: false` + log `public_conversion_persist_skipped` — **não** é telemetria saudável.
- A persistência é **awaited** antes da resposta (sem fire-and-forget no serverless).

### `/comece` — eventos corretos

Em produção, `/comece` dispara **somente** `paid_landing_*` (+ `signup_started` em `/cadastro`).  
**Não** some `landing_viewed` / `plans_cta_clicked` (home orgânica) com `paid_landing_*` na mesma etapa do funil.

Estágios sugeridos: `paid_landing_viewed` → `paid_landing_primary_cta_clicked` / `paid_landing_demo_clicked` → `paid_landing_plan_selected` → `signup_started`.

## Consentimento e privacidade

| Camada | Com recusa de publicidade | Com aceite |
|--------|---------------------------|------------|
| Meta Pixel / CAPI browser | **Não** carrega | Mede PageView/ViewContent |
| Cookies `amem_acq_*` | Permanecem (atribução de funil) | Idem |
| Beacons `/api/acquisition/events` + tabela | **Continuam** (política já documentada em `/cookies` como necessários do funil) | Idem |
| `session_key` | Gerado no cliente sem opt-in de publicidade | Idem |

**First-party não resolve, sozinho, todas as questões de privacidade.** A persistência amplia o que fica no servidor (eventos de funil + sessão de aba). Continua sem PII de conta/conversa, mas é medição comportamental: documente na política de cookies/privacidade se o texto legal ainda falar só em cookies UTM.

### `session_key` ≠ pessoa

- Escopo: **aba** (`sessionStorage`). Nova aba, outro navegador ou limpeza = nova sessão.
- Relatórios usam **`unique_sessions`** (“sessões observadas”), não “visitantes únicos” / pessoas.
- Não serve para identity graph nem remarketing.

### Visitas / sinais fora desta medição

1. **PageView/ViewContent Meta** quando o visitante recusa publicidade.
2. **Visitantes sem JS** ou com bloqueio de `fetch`.
3. **Paths fora da allowlist** — 400; não grava.
4. **Falhas de telemetria / DB** — visitante segue (`202`, `stored: false`); ausência de linha **≠** abandono.
5. **Amostra de logs Vercel** — complementar.
6. **Tráfego QA** — filtrar no relatório.
7. **UTM em comum com `signup_intents`** — overlap aproximado; **não** prova visita→compra. Ver `acquisition_beacon_vs_signup_intents_brt.sql`.

## Proteção

- Zod `.strict()` + sanitize UTM/path + allowlists.
- `Content-Length` ≤ 4 KiB; `Origin` cross-site → 403.
- `GET` → 405 (sem leitura pública).
- Tabela: RLS on, **sem policies**; revoke `anon`/`authenticated`/`public`; grant insert/select só `service_role`.
- Unique `event_id`; conflito 23505 = dedupe.

## Relatório

- Funil geral: `supabase/queries/acquisition_funnel_report_brt.sql`
- Estágios `/comece`: `supabase/queries/acquisition_paid_landing_stages_brt.sql`
- Cobertura beacon × intents: `supabase/queries/acquisition_beacon_vs_signup_intents_brt.sql`
- CLI: `pnpm report:acquisition --from=YYYY-MM-DD --to=YYYY-MM-DD` (`--include-qa`)

## Migration — apply / rollback

**Arquivo:** `supabase/migrations/20260904000013_public_conversion_events.sql`

### Apply (humano, pós-backup)

1. Backup do projeto Supabase.
2. Aplicar **somente** o SQL da `013` (não reaplicar 008–012).
3. `supabase migration repair 20260904000013 --status applied --linked` se o histórico remoto não marcar a versão.
4. Postcheck: `supabase/postchecks/20260904000013_public_conversion_events_postcheck.sql`
5. Deploy do app com a instrumentação.
6. Smoke: POST → `persist.stored=true` + linha; mesmo `event_id` → `duplicate=true`; GET → 405; limpar linhas QA.

### Rollback preferencial

1. **Reverter o deploy do app** (versão anterior). A tabela e os dados **permanecem**.
2. Não usar `DROP TABLE` como rollback automático.
3. Remover apenas registros QA identificados (`utm_campaign`/`utm_content` com prefixo `qa_`).

### Sem migration / sem secret

App responde 202 com `persist.stored=false` e logs de skip/falha; CTAs e cadastro não bloqueiam.
