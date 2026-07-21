# Amém Chat — Execution Backlog

**Data:** 2026-07-20  
**Base:** auditoria `AMEM_FULL_PRODUCT_ENGINEERING_AUDIT_2026-07-20.md` + plano `AMEM_AUTOMATED_REAL_USAGE_TEST_PLAN_2026-07-20.md`  
**Regra:** blocos pequenos, auditáveis; privilegiar P0/P1 → testes de uso real → Admin Mobile → segurança → chat → UX → perf → HC → acquisition → ops runbook → smoke financeiro → só então plan/proration.

**Legenda flags:** `MIG` migration · `STRIPE` pagamento · `REMOTE` recurso remoto · `HUMAN` validação humana

---

## Ordem recomendada

| # | Bloco | Sev foco | Size | Paralelo? | MIG | STRIPE | REMOTE |
|---|-------|----------|------|-----------|-----|--------|--------|
| B00 | Verificação read-only schema/prod health | P1 | S | não (primeiro) | | read | read |
| B01 | Docs DB alinhadas + AppError journeys | P1/P2 | S | após B00 parcial | | | |
| B02 | Base testes uso real (Vitest) | P2 | M | sim c/ B01 docs | | | |
| B03 | Playwright E2E local (anon+planos) | P2 | L | após B02 | | | |
| B04 | Admin Mobile Operations V1 | P2 | M | após B03 smoke gates | | | |
| B05 | Preparar + aplicar 004 (decisão humana) | P1 | M | não | **SIM** | | **SIM** |
| B06 | RLS tests locais pós-004 | P1 | M | após B05 | | | |
| B07 | Crisis / pastoral safety V1 | P1 | L | após B02 | | | |
| B08 | Chat reliability cross-instance | P2 | M | após B05 | | | |
| B09 | UX a11y quick wins | P2 | S | sim c/ B04 | | | |
| B10 | Performance boundaries/loading | P2 | S | sim | | | |
| B11 | Observabilidade chat/client | P2 | S | sim | | | |
| B12 | Help Center & Support Intake V1 | P2 | M | após B04 | | | |
| B13 | Acquisition Content Attribution V1 | P3 | M | sim c/ B12 | | | |
| B14 | Autonomous Operations Runbook V1 | P2 | S | após B03 | | | |
| B15 | Preparação smoke financeiro mock | P1 prep | M | após B14 | | **mock** | |
| B16 | Smoke financeiro humano | P1 | S | após B15 | | **SIM** | **SIM** |
| B17 | Plan Change & Proration | P3 | XL | **somente após B16** | ? | **SIM** | **SIM** |

---

## B00 — Verificação read-only do estado remoto

- **Objetivo:** fechar lacunas AUD-004/005 sem alterar nada.  
- **Escopo:** consultar `/api/health` version; SQL Editor read-only: existência tabelas 005–008; postcheck consolidado 008; amostrar se policies 004 existem.  
- **Fora:** apply migration, rollback, deploy, writes.  
- **Arquivos:** nenhum de código; atualizar só notas ops se necessário em bloco docs.  
- **Testes:** N/A  
- **Riscos:** baixo (read-only)  
- **Dependências:** acesso operador  
- **Aceite:** checklist preenchido: SHA deploy, tabelas presentes/ausentes, 004 sim/não, smoke Jornadas resultado.  
- **Size:** S · **Flags:** `HUMAN` `REMOTE`(read)

---

## B01 — Alinhar docs DB + corrigir contrato AppError journeys

- **Objetivo:** AUD-003, AUD-006.  
- **Escopo:** atualizar `docs/DATABASE.md` (e referências stale em `READING_JOURNEYS_PERSISTENCE` se necessário); corrigir `src/lib/journeys/api-auth.ts` ordem `AppError`; teste contrato.  
- **Fora:** migrations, Stripe, UI.  
- **Arquivos prováveis:** `docs/DATABASE.md`, `src/lib/journeys/api-auth.ts`, `tests/app-error-journey-auth-contract.test.ts`  
- **Testes:** novo Vitest 401/403 codes  
- **Riscos:** baixo  
- **Dependências:** B00 preferível para texto “aplicado” acurado  
- **Aceite:** docs coerentes com B00; clients recebem `code: unauthorized|journeys_not_entitled`  
- **Size:** S · Paralelo docs vs code: sim interno  
- **Flags:** nenhuma MIG/STRIPE/REMOTE

---

## B02 — Base automatizada de uso real (Vitest)

- **Objetivo:** iniciar eliminação de smoke manual (plano §8).  
- **Escopo:** fixtures sintéticas; testes entitlement journeys API; export journeyProgress; admin sem message content; gates anônimos.  
- **Fora:** Playwright, Stripe live, OpenAI live.  
- **Arquivos:** `tests/fixtures/*`, `tests/real-usage-*.test.ts`, opcional script `test:real-usage`  
- **Testes:** os próprios  
- **Riscos:** mocks irreais — revisar com auditoria  
- **Dependências:** B01 para codes estáveis  
- **Aceite:** `pnpm test` cobre matriz auth da tabela §9 do test plan (subset)  
- **Size:** M · Paralelo com B09  
- **Flags:** nenhuma

---

## B03 — Playwright E2E local

- **Objetivo:** cobrir E2E-A/B/C do test plan.  
- **Escopo:** config Playwright; webServer local; DEMO_MODE/MockAi; asserts prefill sem POST chat.  
- **Fora:** produção, billing live.  
- **Arquivos:** `playwright.config.ts`, `e2e/**`, `package.json` scripts  
- **Aceite:** E2E-C passos 1–8 do runbook verdes localmente  
- **Size:** L  
- **Flags:** nenhuma paga

---

## B04 — Admin Mobile Operations V1

- **Objetivo:** AUD-010; operação majoritária no celular.  
- **Escopo:** nav colapsável; KPIs thumb; detalhe stacked; empty states; manter sem conteúdo de conversas.  
- **Fora:** novos dados sensíveis; ações destrutivas novas.  
- **Arquivos:** `src/app/admin/layout.tsx`, pages admin, possivelmente `src/components/admin/*`  
- **Testes:** Playwright viewport + `admin-*.test.ts` source/a11y  
- **Aceite:** operador completa visão→usuário→relatório em 390px sem scroll horizontal crítico  
- **Size:** M  
- **Flags:** nenhuma

---

## B05 — Migration 004 (decisão + apply humano)

- **Objetivo:** AUD-001.  
- **Escopo:** revisar SQL; backup; aplicar em prod **somente** com aprovação; postcheck.  
- **Fora:** mudanças de app além de ajustes se policy quebrar writes legítimos.  
- **Arquivos:** `supabase/migrations/20260712000004_production_hardening.sql`, `docs/DATABASE.md`, `DEPLOYMENT.md`  
- **Testes:** B06  
- **Riscos:** alto — writes client; validar assistant via service role continua OK  
- **Aceite:** policies 004 ativas; chat happy path OK; forge usage falha  
- **Size:** M  
- **Flags:** **`MIG` `REMOTE` `HUMAN`** — **não iniciar sem B00 e janela ops**

---

## B06 — Testes RLS locais pós-004

- **Objetivo:** provar endurecimento.  
- **Escopo:** suite SQL/Vitest contra supabase local.  
- **Fora:** prod.  
- **Aceite:** matriz §10 test plan verde em local  
- **Size:** M · **Flags:** MIG já aplicada em local

---

## B07 — Crisis / pastoral safety V1

- **Objetivo:** AUD-002.  
- **Escopo:** detecção mínima + resposta segura + logging; **sem** fingir autoridade pastoral; alinhar evals.  
- **Fora:** aconselhamento clínico; WhatsApp pastoral.  
- **Arquivos:** `src/lib/safety/*`, `chat-service`, theology rules, eval scenarios  
- **Testes:** theology eval + unit detectors  
- **Aceite:** cenários crise no eval CI; copy aponta ajuda humana/recursos; nunca “eu sou Jesus”  
- **Size:** L · **Flags:** `HUMAN` pastoral review

---

## B08 — Confiabilidade chat / histórico

- **Objetivo:** AUD-009; multi-aba; idempotência DB.  
- **Escopo:** confiar em unique indexes pós-004; melhorar mensagens 409; opcional lease DB.  
- **Fora:** streaming (B futuro).  
- **Arquivos:** `chat-service`, repositories messages  
- **Aceite:** dois workers simulados não duplicam assistant  
- **Size:** M · **Dep:** B05

---

## B09 — UX/UI a11y quick wins

- **Objetivo:** AUD-012/013/014/027.  
- **Escopo:** skip-link legal; focus trap menus/dialog; min touch targets; reduzir aria-live chat.  
- **Fora:** redesign visual.  
- **Arquivos:** `legal-document-shell`, `site-chrome`, `platform-nav`, `subscription-management-panel`, `chat-panel`, `not-found`  
- **Testes:** `mobile-a11y-polish` estender  
- **Aceite:** checklist a11y mobile nos arquivos tocados  
- **Size:** S · Paralelo com B04

---

## B10 — Performance: loading/error boundaries

- **Objetivo:** AUD-015/028 (parcial).  
- **Escopo:** `loading.tsx`/`error.tsx` em auth, conversar, admin raiz; evitar waterfalls óbvios sem refactor grande.  
- **Fora:** remover force-dynamic global.  
- **Size:** S

---

## B11 — Observabilidade

- **Objetivo:** AUD-016.  
- **Escopo:** logar codes 401/400 chat de forma amostrada/segura; correlacionar requestId na UI já existente.  
- **Fora:** enviar conteúdo de mensagens a terceiros.  
- **Size:** S

---

## B12 — Help Center & Support Intake V1

- **Objetivo:** AUD-020.  
- **Escopo:** páginas FAQ/suporte; formulário intake (e-mail/mailto estruturado); **WhatsApp só vendas/suporte/cobrança/acesso**.  
- **Fora:** chat pastoral WhatsApp.  
- **Size:** M

---

## B13 — Acquisition Content Attribution V1

- **Objetivo:** AUD-021.  
- **Escopo:** enriquecer admin aquisição; campanhas conteúdo; sem PII extra.  
- **Size:** M · Paralelo B12

---

## B14 — Autonomous Operations Runbook V1

- **Objetivo:** reduzir carga cognitiva do operador.  
- **Escopo:** doc único: health, alertas, o que automatizado vs humano, critérios de interrupção; apontar para E2E.  
- **Arquivos:** `docs/` runbook novo  
- **Size:** S · **Flags:** docs only

---

## B15 — Preparação smoke financeiro (mock)

- **Objetivo:** fixtures e comandos `test:billing:mock`.  
- **Escopo:** eventos Stripe de teste; reconciliação estados; **sem** sk_live.  
- **Fora:** alterar webhook produção, preços, quotas.  
- **Size:** M · **Flags:** `STRIPE` mock only

---

## B16 — Smoke financeiro humano

- **Objetivo:** validar checkout live controlado.  
- **Escopo:** runbook pagamento mínimo; verificar webhook; cancel/portal.  
- **Fora:** plan change.  
- **Size:** S · **Flags:** **`STRIPE` `REMOTE` `HUMAN`**

---

## B17 — Plan Change & Proration (depois)

- **Objetivo:** AUD-025.  
- **Escopo:** troca de plano + proration + copy + testes.  
- **Fora:** qualquer coisa antes de B16 verde.  
- **Size:** XL · **Flags:** **`STRIPE` `REMOTE` `MIG?` `HUMAN`**

---

## Primeiro bloco de implementação (exato)

Após commit desta auditoria, o **primeiro bloco de implementação de produto/código** deve ser:

> **B01** (AppError journeys + alinhamento `DATABASE.md`),  
> preferencialmente logo após o operador completar **B00** read-only (pode ser paralelo se B01 docs usarem “conforme última verificação” com placeholders).

**Não** iniciar B05 (migration 004), B16/B17 (Stripe), nem refactors grandes nesta sequência imediata.

---

## Status pós terceira sprint intensiva (2026-07-21)

| Bloco | Status |
|-------|--------|
| Inventário promessas | **Concluído** (F1) |
| Retenção V2 | **Concluído** (draft + resume age) |
| Aprofundar UX | **Concluído** (prep + badge) |
| Jornadas V1.1 | **Concluído** (completed state) |
| Onboarding/ativação copy | **Concluído** |
| Conversão Caminho/Profundo | **Concluído** (copy) |
| Admin Mobile V1.2 | **Concluído** (canceling + utm medium/content) |
| Help Center V2 | **Concluído** (search/group/mailto) |
| Segurança local V2 | **Concluído** (safeNextPath + negativos) |
| Performance V2 | **Concluído** (loadings + ShareInvite dynamic) |
| real-usage expandido | **61** (era 34) |
| B00 / MIG 004 / Stripe / Playwright | **Bloqueado** — ver `AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md` |

Ver log: `docs/_ai/AMEM_THIRD_INTENSIVE_SPRINT_2026-07-21.md`.

---

## Status pós segunda sprint intensiva (2026-07-21)

| Bloco | Status |
|-------|--------|
| B01 AppError + DATABASE | **Concluído** (sprint 1) |
| B02 Vitest real-usage | **Concluído** (+ matriz E2E crítica sprint 2) |
| B03 Playwright | **Adiado** — spike `AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md` |
| B04 Admin Mobile | **Concluído** (+ V1.1 attention) |
| B05 MIG 004 | **Bloqueado** MIG/REMOTE/HUMAN |
| B07 Crisis | **Concluído** |
| B08 Chat reliability | **Parcial** — mitigações locais; cross-instance dep. 004 |
| B09 A11y | **Concluído** (sprint 1) |
| B10 Performance boundaries | **Concluído** (sprint 2) |
| B11 Observabilidade | **Concluído** (redaction + health) |
| B12 Help Center | **Concluído** V1.1 |
| B13 Acquisition | **Concluído** V1 admin content |
| B15/B16 Financial smoke | **Bloqueado** STRIPE/REMOTE/HUMAN |
| B17 Proration | **Bloqueado** até B16 |

Ver log: `docs/_ai/AMEM_SECOND_INTENSIVE_SPRINT_2026-07-21.md`.

---

## Fora de escopo permanente nesta fase de backlog curto

- Apresentar IA como Jesus/Deus/profeta  
- WhatsApp pastoral  
- Commit de `src/lib/database/repositories/index.ts` (CRLF)  
- Deploy manual / rollback / alteração remota sem runbook  

---

*Backlog elaborado sem executar correções de produto, migrations ou mudanças financeiras.*
