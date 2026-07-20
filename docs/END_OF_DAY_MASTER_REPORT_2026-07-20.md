# End-of-Day Master Report — 2026-07-20

Relatório mestre do estado do Amém Chat ao encerrar o dia.  
Compreensível para outro agente/humano sem reler o chat completo.

---

## Estado do produto

- **Produto:** Amém Chat (`amemchat.com.br`) — reflexões cristãs baseadas nas Escrituras (não é Jesus/Deus/revelação).
- **Branch:** `main`, alinhada com `origin/main`.
- **SHA de referência da feature Jornadas:** `7113493` (`feat: add guided reading journeys`).
- **Produção:** auto-deploy a partir de `main`; confirmar `/api/health` → campo `version`.
- **Reading Journeys MVP V1:** publicado e ativo para Caminho / Profundo / Particular.
- **Smoke autenticado:** ainda **pendente** (não executado nesta noite).
- **Decisão WhatsApp:** somente comercial, suporte e cobrança — **sem** reflexões espirituais ou chat pastoral no WhatsApp.

---

## Commits relevantes recentes

| SHA | Título | Escopo |
|-----|--------|--------|
| `5ab9cf2` | Plan Differentiation & Ethical Upsell V1 | Posicionamento de planos, upsells éticos, FAQ; preços intactos |
| `13258e5` | Journey Progress Persistence Foundation | Migration `journey_progress`, RPCs, repository/service, mapper |
| `7113493` | Reading Journeys MVP V1 | Registry 3×7, entitlement, UI, APIs, export, admin, theology eval |

Docs/runbook desta noite: commit `docs: add launch resumption runbook` (SHA após push).

---

## Migration

- Arquivo: `supabase/migrations/20260712000008_journey_progress.sql`
- **Status:** aplicada manualmente em Supabase Production (humano).
- Tabela: `public.journey_progress` (progresso por `user_id` + `journey_slug`; só ids de etapa + timestamps).
- RPCs: `start_journey_progress`, `complete_journey_progress_step`, `reset_journey_progress`.
- Postcheck original (multi-result): `supabase/postchecks/20260712000008_journey_progress_postcheck.sql`
- **Postcheck preferencial (uma linha):** `supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql`
- Runtime da app **consulta** a tabela via repository/service nas rotas `/jornadas` e `/api/journeys/*`.
- **Não** reaplicar migration; **não** executar rollback.

---

## Funcionalidades ativas

| Área | Status |
|------|--------|
| Auth + onboarding | Ativo |
| Chat padrão | Ativo (`chat_standard`) |
| Aprofundar | Ativo no Profundo (+ Particular se provisionado) — `chat_deep` |
| Jornadas de leitura | Ativo — `reading_journeys` |
| Portabilidade (export) | Ativo — `amem-chat-user-data-v1` + `journeyProgress` |
| Admin assinantes | Ativo (resumo de jornadas sem conteúdo pessoal) |
| Billing Stripe | Checkout / portal / cancel-reativar (sem troca de plano) |

---

## Matriz de planos (preços intactos)

| Plano | Preço | Jornadas | Aprofundar |
|-------|-------|----------|------------|
| Essencial | R$ 38 | Não | Não |
| Caminho | R$ 58 | Sim | Não |
| Profundo | R$ 188 | Sim | Sim |
| Particular | R$ 988 (solicitar) | Sim (se provisionado) | Sim (se provisionado) |

---

## Rotas principais (Jornadas)

| Rota | Nota |
|------|------|
| `/jornadas` | Catálogo (privada, noindex) |
| `/jornadas/[slug]` | Visão + reset |
| `/jornadas/[slug]/[step]` | Etapa |
| `/jornada` | Redirect → `/jornadas` |
| `/api/journeys/progress*` | Progresso autenticado |
| `/conversar?jornada=&etapa=` | Prefill allow-listed |

Sitemap **não** inclui jornadas/etapas.

---

## Integrações das Jornadas

- `/inicio` — card
- Nav autenticada — link Jornadas
- `/conta` — resumo + link
- Export — `journeyProgress`
- Admin detalhe — contadores
- Eventos operacionais (logger): `journey_catalog_viewed`, `journey_started`, `journey_step_completed`, `journey_completed`, `journey_chat_prefill_opened`, `journey_reset`

---

## Segurança teológica

- Registry editorial estático (sem AI na leitura da etapa).
- `pnpm eval:theology:journeys` — 21 etapas offline.
- Chat: políticas existentes + output gate; prefill não altera system prompt.

---

## Portabilidade / Admin / Produção

- Export aditivo em v1; sem respostas pessoais de jornadas (não são persistidas).
- Admin: sem edição de progresso; sem texto de reflexão.
- Produção: health com SHA do deploy; anônimo em `/jornadas` → login.

---

## Gates (última verificação da noite)

Executar e registrar no commit de docs: testes planos/jornadas/portabilidade, `eval:theology:journeys`, `eval:theology:ci`, `launch:check`, `lint`, `test`, `build`.

---

## Limitações

- Smoke autenticado humano ainda não feito.
- Revisão pastoral humana das 21 etapas pendente.
- Sem troca de plano / proration.
- Sem WhatsApp espiritual.
- Sem streaming no chat.
- Sem exclusão self-service de conta.
- Postcheck multi-result antigo ainda existe; preferir o consolidado.

---

## Smoke pendente

Ver `docs/TOMORROW_LAUNCH_RUNBOOK.md` — primeira ação amanhã.

---

## Prioridades de amanhã

1. Smoke autenticado Jornadas (Caminho + Essencial).
2. Se verde → **Admin Mobile Operations V1**.
3. Só depois: Help Center, Attribution, Operations Runbook; smoke pagamento antes de Plan Change.

---

## Decisões WhatsApp (já tomadas)

- Canais permitidos: comercial, suporte, cobrança.
- **Proibido** neste produto: reflexões espirituais / chat pastoral via WhatsApp.
- Não introduzir entitlement ou copy de “WhatsApp espiritual” sem decisão explícita nova.
