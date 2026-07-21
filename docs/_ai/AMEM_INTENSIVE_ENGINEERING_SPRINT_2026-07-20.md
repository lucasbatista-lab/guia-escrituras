# Amém Chat — Intensive Engineering Sprint Log

**Início:** 2026-07-20 (noite)  
**HEAD inicial:** `b954a05`  
**Branch:** `main`

## Ordem de blocos

1. F0 Triagem P1  
2. B01 Docs DATABASE + AppError journeys  
3. B02 Vitest real-usage  
4. B07 Crisis safety V1  
5. B04 Admin Mobile Ops V1  
6. B09 A11y quick wins (se independente)  
7. B03 Playwright — só se sustentável  
8. B08 Chat reliability local (sem MIG)  
9. B11 Observabilidade  
10. B12 Help Center (se couber)  
11. Docs matriz valor + prep smoke financeiro  

**Skip nesta sprint (flags):** B00 remoto HUMAN · B05 MIG · B16/B17 Stripe live

---

## F0 — Triagem (2026-07-20 ~23:54)

### Estado confirmado

- HEAD = origin/main = `b954a05`
- Dirty: apenas CRLF `src/lib/database/repositories/index.ts` (não commitável)
- Docs auditoria presentes em `docs/_ai/`
- Scripts: vitest, lint, build, launch:check, eval theology — sem Playwright

### Triagem P1

| ID | Título | Veredito | Evidência |
|----|--------|----------|-----------|
| AUD-001 | RLS pré-004 forge | **P1 confirmado como risco residual de schema**; remoto não inspecionado | `001` policies `messages_insert_own` / `usage_events_insert_own` sem role/ownership; `004` remove; cutover docs: 004 **não** aplicada; app mitiga path normal via service role |
| AUD-002 | Crise ausente | **P1 confirmado** | Sem detector no chat path; docs AI_AND_THEOLOGY |
| AUD-003 | DATABASE.md stale | **P1 confirmado (ops)** | Diz 008 “não aplicar”; END_OF_DAY/NEXT_STEPS: 008 aplicada |
| AUD-004 | 005–007 remoto | **P1 ops / lacuna** — não confirmável aqui | Código billing/legal depende; sem SQL remoto nesta sprint |
| AUD-005 | Smoke Jornadas | **P1 ops** → mitigável por automação B02 | Smoke humano ainda pendente; automatizar equivalentes |

### AUD-001 artefatos (sem migration)

- Teste estático: `tests/persistence-and-migration004.test.ts` (já existe) + reforço em sprint se útil  
- Consulta read-only proposta (humano, SQL Editor):  
  `select polname from pg_policy where polrelid = 'public.messages'::regclass;`  
  Esperado pós-004: `messages_insert_own_user_role`; pré-004: `messages_insert_own`  
- Risco residual: cliente autenticado pode forjar usage/role até 004  
- Recomendação: B05 humano após B00; **não aplicar nesta sprint**

### B00

**Adiado** — exige acesso remoto humano. Placeholder checklist no fim do log.

---

## B01 — Docs DATABASE + AppError journeys (~23:56)

- **Objetivo:** AUD-003 + AUD-006  
- **Investigação:** `AppError(message, code, status, safeMessage)` vs calls com args invertidos em `api-auth.ts`; `toClientError` expunha `code` em português.  
- **Evidências:** teste contrato vermelho antes da correção (reproduzido na ordem args); policies 001 vs 004 documentadas.  
- **Arquivos:** `src/lib/journeys/api-auth.ts`, `docs/DATABASE.md`, `tests/journey-api-auth-contract.test.ts`, este log  
- **Testes:** `journey-api-auth-contract` + `persistence-and-migration004` — PASS  
- **Resultado:** codes `unauthorized` / `journeys_not_entitled` estáveis; DATABASE alinhado a 008 aplicada / 004 não / 005–007 a confirmar  
- **Commit:** `fe4c3af`  
- **Riscos residuais:** AUD-001/004 ainda dependem de B00/B05 humanos  
- **Próximo:** B02 real-usage Vitest  

---

## B02 — Base testes uso real Vitest (~23:58)

- **Objetivo:** AUD-005 mitigação; pirâmide §8 do test plan  
- **Investigação:** fixtures por plano; matriz auth; fluxo Caminho memory; prefill sem auto-send  
- **Arquivos:** `tests/fixtures/synthetic-users.ts`, `tests/real-usage-*.test.ts`, `package.json` (`test:real-usage`)  
- **Testes:** `pnpm test:real-usage` — 24 PASS  
- **Resultado:** cobertura determinística anon/essencial/caminho/profundo/particular/admin contratos  
- **Commit:** `64b5a54`  
- **Riscos:** ainda sem Playwright E2E; smoke humano residual  
- **Próximo:** B07 crisis safety  

---

## B07 — Crisis safety V1 (~00:01)

- **Objetivo:** AUD-002  
- **Investigação:** multi-sinal PT-BR; locale BR separado; intercept antes do modelo; sem persistir classificação  
- **Arquivos:** `src/lib/safety/crisis/*`, `chat-service.ts`, `general-rules.ts`, `AI_AND_THEOLOGY.md`, eval report/evaluate, `tests/crisis-safety.test.ts`  
- **Testes:** crisis-safety + chat-reliability + theology — PASS; eval theology ci/journeys  
- **Resultado:** intercept determinístico; falsos positivos comuns rejeitados  
- **Commit:** `ac47ec2`  
- **Riscos:** calibragem pastoral humana; panico+agora classificado como medical_emergency  
- **Próximo:** B04 Admin Mobile Ops V1  

---

## B04 — Admin Mobile Operations V1 (~00:02)

- **Objetivo:** AUD-010  
- **Arquivos:** `admin-mobile-nav.tsx`, `admin/layout.tsx`, `admin/loading.tsx`, `aquisicao/page.tsx`, usuarios pages, `tests/admin-mobile-ops.test.ts`  
- **Testes:** admin-mobile-ops + admin suites — PASS  
- **Resultado:** nav primary+Mais no mobile; cards em aquisição; loading skeleton  
- **Commit:** `c521b6c`  
- **Próximo:** B09 a11y quick wins  

---

## B09 — A11y quick wins (~00:04)

- **Objetivo:** AUD-012/014/027  
- **Arquivos:** legal-document-shell, not-found, chat-panel, mobile-a11y-polish.test  
- **Testes:** mobile-a11y-polish PASS  
- **Commit:** `565776b`  

---

## B12 — Help Center & Support Intake V1 + matrizes (~00:06)

- **Objetivo:** AUD-020; docs matriz valor + prep smoke financeiro  
- **Arquivos:** `src/lib/support/help-center.ts`, `(marketing)/ajuda/page.tsx`, sitemap, site-chrome, conta, docs `_ai` matriz e financial prep, `tests/help-center.test.ts`  
- **Testes:** help-center + seo/launch-conversion — PASS  
- **Resultado:** `/ajuda` público; mailto categorizado; sem intake espiritual  
- **Commit:** (pendente)  
- **Não iniciado:** B03 Playwright, B05 MIG, B08 cross-instance (dep 004), B13 acquisition, B16 live smoke  

---
