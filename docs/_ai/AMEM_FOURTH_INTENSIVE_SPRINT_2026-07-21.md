# Amém Chat — Fourth Intensive Sprint Log

**Data:** 2026-07-21  
**Branch:** `main`  
**HEAD inicial:** `2fee6a0`  
**HEAD final:** _(atualizado no fechamento)_

## F0 — Confirmação e regression review

| Item | Valor |
|------|--------|
| HEAD / `origin/main` | `2fee6a0` |
| Working tree | limpo exceto CRLF `src/lib/database/repositories/index.ts` (**não stage**) |
| `pnpm test` | **848** PASS |
| `pnpm test:real-usage` | **61** PASS |
| Commits desde `b954a05` / sprint 1 | ver `git log --oneline` até tip |

### Lista priorizada de regressões potenciais (antes de alterar código)

| # | Sev | Área | Achado | Fix sprint 4? |
|---|-----|------|--------|---------------|
| 1 | P1 | auth | Redirects de páginas platform usam `next` sem query/slug (`/conversar`, `/jornadas/.../step`); proxy preserva search | **Sim** — helper + testes |
| 2 | P1 | conversion | FAQ home/ajuda divergem de `/planos` (sem disclaimer troca de plano / Aprofundar / Jornadas) | **Sim** — FAQ compartilhado |
| 3 | P1 | entitlements | `resolveEntitlements().has()` trata keys reservadas como concedidas | **Sim** — filtrar ACTIVE only |
| 4 | P2 | journeys | Complete button: cobertura quase só source-string; faltam negativos 401/403/rede | **Sim** — mapper + testes |
| 5 | P2 | chat | Thin negatives client (retry/deep clear); lock cross-instance residual MIG 004 | Parcial local |
| 6 | P2 | privacy | `redactLogFields` shallow; nested content / email keys | **Sim** |
| 7 | P2 | admin | Canceling alert: falta negativo `null` → sem alerta | **Sim** |
| 8 | P2 | quality | Duplicação `RESPONSE_FORMAT_HINT`, `isSameLocalDay`, FAQ | **Sim** se seguro |
| 9 | P2 | auth | `safeNextPath` rejeita `:` também em query legítima | Documentar + testar fallback |
| 10 | P2 | docs | Playwright “seguro agora”; fixtures “não criados”; tip SHA drift | **Sim** docs |
| 11 | P3 | chat | Datas inválidas → tom “recent”; ChatPanel monolítico | Só se banda |

### Residual obrigatório (não fingir)

B00 remoto · MIG 004 · Stripe/checkout/billing/preços/quotas/webhook/proration · Playwright harness · lock cross-instance · smoke humano · pastoral · deepen persistido (schema) · search server-side · WA espiritual

---

## Ordem de execução

1. F0 ✓ · 2. F2 Auth deep-link · 3. F1 Negativos (junto) · 4. Entitlements hygiene · 5. Conversão FAQ · … (demais blocos)

---

## F2 (+ F1 parcial) — Auth deep-link + safeNextPath query

- **Objetivo:** pós-login retomar `/conversar?c=&tema=&jornada=&etapa=` e `/jornadas/{slug}/{step}`  
- **Evidência:** pages usavam `next=/conversar` / `next=/jornadas` sem contexto; proxy já preservava search  
- **Decisão:** helpers `buildConversarResumePath`, `buildJourneyResumePath`, `buildLoginHref`; `safeNextPath` permite `:` só na query  
- **Arquivos:** `safe-next-path.ts`, `conversar/page.tsx`, `jornadas/[slug]/page.tsx`, `jornadas/.../[step]/page.tsx`, `tests/auth-deep-link-resume.test.ts`, `package.json`  
- **Testes:** auth-deep-link-resume + local-security + launch-funnel + mobile-a11y + edge-redirects  
- **Residual:** demais redirects path-only OK; colon em pathname ainda rejeitado  

---
