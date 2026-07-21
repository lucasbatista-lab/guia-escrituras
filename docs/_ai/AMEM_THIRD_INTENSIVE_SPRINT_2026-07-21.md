# Amém Chat — Third Intensive Sprint Log

**Data:** 2026-07-21  
**Branch:** `main`  
**HEAD inicial:** `6b7b0f5` (pós-reconciliação; tip anterior `b8f64fd`)  
**HEAD final:** `4431637` (tip; fechamento substantivo `33a7a9a`)

## F0 — Reconciliação Git (`3a05e72` × `b8f64fd`)

| Item | Valor |
|------|--------|
| HEAD / `origin/main` na entrada | `b8f64fd` |
| Working tree | limpo exceto CRLF `src/lib/database/repositories/index.ts` |
| `3a05e72` | Fechamento **substantivo** da sprint 2: docs + split client/server de histórico (`display.ts`), ajustes de testes/health |
| `b8f64fd` | **Somente docs**: substituiu placeholder “HEAD final: (atualizado no commit F12)” por `` `3a05e72` `` |
| Por que o log dizia `3a05e72` e o retorno `b8f64fd` | O log registrou o SHA do fechamento de produto; o tip do repo avançou 15s depois com o carimbo documental. Ambos corretos em papéis diferentes. |
| Correção | Doc sprint 2: **HEAD final** = `b8f64fd` (docs-only; substantivo `3a05e72`) — commit `6b7b0f5` |

**Não** alterado: código produtivo, migrations, Stripe, billing, preços, quotas.

---

## F1 — Inventário de promessas e gaps

Varredura: `em desenvolvimento` / `em breve` / `coming soon` / `TODO` / `FIXME` / entitlements reservados / pricing / paywalls / onboarding / conta / admin / docs.

| Recurso | Plano | Onde aparece | Estado real | Dep. | MIG? | Stripe? | OpenAI? | Risco | Conv. | Ret. | Classificação | Recomendação |
|---------|-------|--------------|-------------|------|------|---------|---------|-------|-------|------|---------------|--------------|
| Chat standard | todos pagos | home, planos, chat | **Ativo** | — | não | não | mock ok | Baixo | Alto | Alto | concluído | Manter |
| Histórico + resume | todos | `/conversas`, `/inicio` | **Ativo** (+ V1.1) | — | não | não | não | Baixo | Médio | Alto | concluído | Manter; F2 draft local |
| Aprofundar | Profundo+ | chat, `/planos#aprofundar` | **Ativo** (entitlement) | budget | não | não | sim (path) | Médio custo | Alto | Médio | melhorar apresentação | F3 UX valor sem quota |
| Jornadas 3×7 | Caminho+ | `/jornadas`, início | **Ativo** | 008 | não* | não | não | Médio editorial | Alto | Alto | melhorar UX | F4 V1.1 polish |
| Uso frequente / fair use | Caminho+ | copy planos | **Parcial** (budgets por plano; keys `chat_frequent`/`fair_use_extended` **reservadas**) | config | não | não | não | Baixo | Médio | Médio | melhor apresentar | Copy já honest; não fingir entitlement |
| Memória ampliada | Profundo | Em desenvolvimento | **Reservado** | MIG? | talvez | não | sim | Alto | Médio | Alto | permanecer futuro | Não vender como ativo |
| Múltiplas personas | Profundo | Em desenvolvimento / reserved | **Reservado** | teol. | não | não | sim | **Alto teol.** | Médio | Médio | permanecer futuro | Não implementar nesta sprint |
| Áudio | Profundo | Em desenvolvimento | **Reservado** | custo | talvez | não | sim | Alto | Médio | Médio | permanecer futuro | Manter só roadmap |
| Troca automática de planos | todos | planos, conta, FAQ, upsell | **Não implementado** | B16/B17 | ? | **SIM** | não | Alto $ | Alto | — | depende billing | Comunicação honesta já; não fingir |
| Alteração de e-mail na conta | todos | `/conta` | **Não disponível** | Auth | não | não | não | Baixo | Baixo | Baixo | pode melhorar apresentação | Manter disclaimer; ops futuro |
| Priority support | Profundo | reserved + mailto | **Parcial** (HC mailto) | ops | não | não | não | Baixo | Médio | Médio | melhor apresentar | F8 HC |
| Concierge / WhatsApp Particular | Particular | upcoming | Flag / manual | HUMAN | não | não | não | WhatsApp pastoral **proibido** | — | — | permanecer futuro / não espiritual | Nunca chat pastoral WA |
| Crisis safety | todos | chat path | **Ativo V1** | calibragem | não | não | não | Alto se falhar | — | Confiança | concluído | Revisão pastoral humana |
| Help Center | todos | `/ajuda` | **Ativo V1.1** | — | não | não | não | Baixo | Médio | Médio | melhorar | F8 busca/categorias |
| Admin Mobile Ops | ops | `/admin` | **Ativo V1.1** | — | não | não | não | Baixo | — | — | melhorar | F7 filtros atenção |
| Aquisição medium/content | ops | admin aquisição | **Ativo V1** | — | não | não | não | Baixo | — | — | melhorar | F7 filtros lista |
| Canal suporte e-mail | todos | ajuda (`SUPPORT_CHANNEL_PENDING` se vazio) | Condicional env | config | não | não | não | Baixo | Médio | — | melhor apresentar | Já honest |
| Playwright E2E | — | spike | **Adiado** | harness | não | não | não | Flaky | — | — | permanecer futuro | Sem install |
| Lock chat cross-instance | — | chat | **Parcial** local | MIG 004 | **SIM** | não | não | Médio | — | Médio | depende migration | Não fingir |
| RLS 004 | — | schema | **Não aplicada** | HUMAN | **SIM** | não | não | P1 | — | — | depende migration | B00/B05 |
| extended_memory no entitlement Profundo | Profundo | `plans.ts` entitlements[] | Listado no catálogo interno; **não** ativo em runtime; cards públicos filtram | — | — | — | — | Confusão interna | — | — | melhor apresentar / dívida | Não misturar em displayBenefits (já OK) |
| Onboarding `/onboarding` | todos | rota | Redirect → `/personalizar` | — | não | não | não | Baixo | Médio | Médio | melhorar ativação | F5 |
| CTA home → planos | anôn. | home | Intencional plan-first | — | não | não | não | Baixo | Alto | — | melhor apresentar | F5/F6 alinhar expectativa |
| Favoritos de mensagens | — | matriz | Ausente | MIG | **SIM** | não | não | Baixo | Médio | Alto | depende migration | Adiar |
| Streaming chat | — | NEXT_STEPS | Ausente | — | não | não | sim | Médio | Médio | Médio | permanecer futuro | Adiar |
| Exclusão de conta | — | NEXT_STEPS | Ausente | legal | talvez | não | não | Médio | Baixo | — | permanecer futuro | Após portabilidade |
| Receita Stripe no daily report | ops | enrich null | Não integrado | Stripe | não | read | não | Baixo | — | — | depende financeiro | Prep only |
| Smoke financeiro / proration | — | prep docs | Bloqueado | HUMAN | ? | **SIM** | não | Alto | — | — | depende billing | F12 prep only |

\*Jornadas: schema 008 já aplicado; sem nova migration nesta sprint.

### Decisões F1 (sem alterar copy ainda)

- **Pode concluir agora:** draft local chat; Jornadas UX completed; Aprofundar badge UI; HC search; admin filtros; onboarding/ativação copy; segurança negativa; perf local; testes.
- **Melhor apresentar agora:** home CTA; diferenciação Caminho/Profundo; HC timing; conta e-mail.
- **Depende migration:** favoritos, lock cross-instance, RLS 004, talvez memória ampliada.
- **Depende billing:** troca de plano, proration, smoke live.
- **Remover da comunicação:** nada inventado encontrado nos cards públicos (roadmap isolado em “Em desenvolvimento” — manter).
- **Permanecer futuro:** personas, áudio, streaming, WA espiritual, Playwright até harness.

---

## Ordem de execução (blocos seguros)

1. F0 ✓ · 2. F1 ✓ · 3. F2 Retenção · 4. F3 Profundo · 5. F4 Jornadas · 6. F5 Onboarding · 7. F6 Conversão · 8. F7 Admin · 9. F8 Suporte · 10. F9 Segurança · 11. F10 Perf · 12. F11 Testes · 13. F12 Prep humano · 14. F13 Docs/gates

---

## F2 — Retenção e continuidade V2

- **Objetivo:** draft local + retorno após dias sem inferência espiritual  
- **Evidência:** composer perdia texto ao sair; resume copy única  
- **Arquivos:** `composer-draft.ts`, `chat-panel.tsx`, `display.ts`, `inicio/page.tsx`, `tests/retention-continuity-v2.test.ts`  
- **Testes:** retention + conversation-resume + first-use  
- **Commit:** `6759a6f`  
- **Residual:** draft só sessionStorage; sem search server-side  

## F3 — Profundo / Aprofundar

- **Objetivo:** transparência do que será aprofundado + badge de resposta  
- **Arquivos:** `chat-panel.tsx`, `chat-history-ui.ts`, testes deep/history  
- **Commit:** `3abd2d2`  
- **Residual:** flag `deepened` sessão-only (schema sem coluna)  

## F4 — Jornadas V1.1

- **Objetivo:** estado concluído da etapa + próxima ação  
- **Arquivos:** `journey-step-complete-button.tsx`, `jornadas/.../[step]/page.tsx`, `tests/journeys-v1-1-ux.test.ts`  
- **Commit:** `a4b2fad`  

## F5 — Onboarding / ativação

- **Objetivo:** CTAs honestos home → planos; personalizar sem fricção falsa  
- **Before→After:** “Começar com a minha situação” → “Ver planos e começar”; final “Pronto para escolher um plano?”  
- **Commit:** `30da905`  

## F6 — Conversão / pricing V2

- **Objetivo:** Caminho=Jornadas; Profundo=Aprofundar (sem preço/quota)  
- **Arquivos:** `plans.ts`, `reserved.ts`, `plan-upsell.ts`  
- **Commit:** `9f949ed`  

## F7 — Admin Mobile Ops V1.2

- **Objetivo:** alerta cancelando + filtros utm_medium/content  
- **Arquivos:** `operational-alerts.ts`, `user-list-params.ts`, `users.ts`, `usuarios/page.tsx`  
- **Commit:** `485be43`  

## F8 — Suporte self-service V2

- **Objetivo:** busca FAQ + agrupamento + mailto por categoria  
- **Arquivos:** `help-center.ts`, `help-faq-search.tsx`, `ajuda/page.tsx`  
- **Commit:** `b2337b0`  

## F9 — Segurança local V2

- **Objetivo:** `safeNextPath` rejeita `:` / controles / oversized; suite negativa  
- **Arquivos:** `safe-next-path.ts`, `user-list-params.ts` (strip HTML em q), `tests/local-security-v2.test.ts`  
- **Commit:** `27a380d`  
- **Residual:** RLS 004 remoto não fingido  

## F10 — Performance V2

- **Objetivo:** loading boundaries + ShareInvite dynamic na home  
- **Arquivos:** `jornadas/loading.tsx`, `conversas/loading.tsx`, `ajuda/loading.tsx`, home dynamic  
- **Commit:** `4a28689`  
- **Evidência:** chunk share separado do critical path; skeletons em rotas force-dynamic  

## F11 — Testes V2

- **Objetivo:** expandir `test:real-usage`  
- **Antes:** 34 · **Depois:** **61**  
- **Commit:** `38cfed0`  

## F12 — Prep bloqueios humanos

- **Doc:** `docs/_ai/AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md`  
- **Commit:** `d509bb9`  
- **Sem execução remota**  

## Gates finais

| Gate | Resultado |
|------|-----------|
| `pnpm test:real-usage` | PASS (**61**) |
| `pnpm eval:theology:journeys` | PASS |
| `pnpm eval:theology:ci` | PASS |
| `pnpm launch:check` | PASS |
| `pnpm lint` | PASS (0 erros, 5 warnings preexistentes) |
| `pnpm test` | PASS (**848**) |
| `pnpm build` | PASS |

## Confirmações

- `repositories/index.ts` **nunca** staged/commitado  
- Sem migrations / Stripe / checkout / billing / preços / quotas / webhook / proration / deploy / remoto  
- Playwright **não** instalado  
