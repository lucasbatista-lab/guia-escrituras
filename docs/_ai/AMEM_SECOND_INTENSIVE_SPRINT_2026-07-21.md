# Amém Chat — Second Intensive Sprint Log

**Data:** 2026-07-21  
**Branch:** `main`  
**HEAD inicial:** `7682398`  
**HEAD final:** `3a05e72`

## Ordem executada

1. F0 Confirmação  
2. F1 Chat/histórico confiabilidade  
3. F2 Histórico retenção  
4. F3 Playwright spike → DEFER  
5. F4 Segurança persona + cache headers  
6. F5 Performance cache + boundaries + custos  
7. F6 Aquisição admin V1  
8. F7 Valor Caminho/Profundo (2 recursos)  
9. F8 Conversão/copy  
10. F9 Admin attention V1.1  
11. F10 Help Center V1.1  
12. F11 Observabilidade  
13. F12 Docs + gates  

**Skip permanente nesta sprint:** migrations, Stripe, checkout, billing, preços, quotas, webhook, proration, deploy, remoto.

---

## F0 — Confirmação

- HEAD = origin/main = `7682398`
- Dirty: só CRLF `src/lib/database/repositories/index.ts` (não commitado)
- Testes: **780**/780
- `test:real-usage`: 24 → depois expandido
- Inconsistência docs: NEXT_STEPS ainda listava Admin Mobile como pendente (já entregue na sprint anterior) — corrigido em F12

---

## F1 — Chat e histórico (confiabilidade)

- **Objetivo:** mitigar double-submit, URL sync, rollback, notice idempotente, load errors  
- **Evidência:** `sendingRef` ausente; `?c=` não sincronizava; notice “idempotente” vazava; load DB → 404  
- **Decisão:** mitigação local; lock cross-instance **não** resolvido (dep. MIG 004 / lease)  
- **Arquivos:** `chat-history-ui.ts`, `chat-panel.tsx`, `conversar/page.tsx`, `chat-service.ts`, `tests/chat-history-reliability.test.ts`  
- **Testes:** chat-history-reliability + chat-reliability  
- **Commit:** `2e6e32f`  
- **Residual:** lock process-local; notice/follow-up não persistidos (schema)

---

## F2 — Histórico retenção

- **Objetivo:** retorno ao produto via agrupamento, busca local, previews limitados, load-more, empty Jornadas  
- **Arquivos:** `history-list.ts`, `conversation-history-list.tsx`, `conversas/page.tsx`, testes  
- **Commit:** `69700d7`  
- **Residual:** sem search server-side; preview cap 8 (anti N+1)

---

## F3 — Playwright

- **Decisão:** **DEFER** — `next start` + DEMO_MODE não libera mocks; persona demo única; journeys precisam Supabase  
- **Doc:** `docs/_ai/AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md`  
- **Mitigação:** `tests/real-usage-e2e-critical-flows.test.ts` + script `test:real-usage`  
- **Commit:** `f17e6eb`

---

## F4 — Segurança

- **personaKey** allowlist via `resolveAuthorizedPersonaKey`  
- **Cache-Control: private, no-store** em `/api/chat` e `/api/usage`  
- **Commit:** `681308e`  
- **Residual MIG:** AUD-001 RLS pré-004

---

## F5 — Performance

- `React.cache` em `getAuthUserContext` + `resolveUserJourneyState`  
- Pages alinhadas a `resolveUserJourneyState()`  
- `error.tsx`/`loading.tsx` auth/platform/admin  
- `getAdminAiCostMetrics` para `/admin/custos`  
- **Commit:** `5b8b927`

---

## F6 — Aquisição

- `byMedium`, `bySourceContent`; copy intent ≠ Stripe; `utmContent` no detalhe usuário  
- **Commit:** `4ff53d0`  
- **Residual:** `landing_path` só cookie; signup sem plano não cria intent

---

## F7 — Valor premium (2)

1. Continuidade Jornadas no `/inicio` (deep link etapa) — PRD + `37d6ca2`  
2. Copy Aprofundar concreta — mesmo commit + hotfix teste `e5424ea`

---

## F8 — Copy conversão

- Home planos: Essencial/Caminho/Profundo concretos sem shaming  
- **Commit:** `42bf0e6`

---

## F9 — Admin Mobile V1.1

- Seção “Precisa da sua atenção” sempre visível + empty  
- **Commit:** `7bb4d38`

---

## F10 — Help Center V1.1

- FAQs técnico/crise; `SUPPORT_RESPONSE_NOTE`  
- **Commit:** `1127e6b`

---

## F11 — Observabilidade

- `redactLogFields` no logger; health com checks seguros + requestId  
- **Commit:** `aaa40dd`

---

## Gates finais

| Gate | Resultado |
|------|-----------|
| `pnpm test:real-usage` | PASS (34) |
| `pnpm eval:theology:journeys` | PASS |
| `pnpm eval:theology:ci` | PASS |
| `pnpm launch:check` | PASS |
| `pnpm lint` | PASS (0 erros, 5 warnings preexistentes) |
| `pnpm test` | PASS (**822**) |
| `pnpm build` | PASS |

## Confirmações

- `repositories/index.ts` **nunca** staged/commitado  
- Sem migrations / Stripe / checkout / billing / preços / quotas / webhook / proration / deploy / remoto  
- Playwright **não** instalado  
