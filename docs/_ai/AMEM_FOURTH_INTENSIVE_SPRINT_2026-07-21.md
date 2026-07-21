# Amém Chat — Fourth Intensive Sprint Log

**Data:** 2026-07-21  
**Branch:** `main`  
**HEAD inicial:** `2fee6a0`  
**HEAD final:** `59e4b57` (tip; fechamento substantivo `ebe9fe1`; gates em `b1da4b2`)

## F0 — Confirmação e regression review

| Item | Valor |
|------|--------|
| HEAD / `origin/main` | `2fee6a0` |
| Working tree | limpo exceto CRLF `src/lib/database/repositories/index.ts` (**não stage**) |
| `pnpm test` (baseline) | **848** PASS |
| `pnpm test:real-usage` (baseline) | **61** PASS |

### Lista priorizada de regressões (antes de alterar código)

| # | Sev | Área | Achado | Fix |
|---|-----|------|--------|-----|
| 1 | P1 | auth | Redirects sem query/slug | ✓ |
| 2 | P1 | conversion | FAQ home/ajuda ≠ planos | ✓ |
| 3 | P1 | entitlements | reserved keys via `has()` | ✓ |
| 4 | P2 | journeys | complete sem negativos | ✓ |
| 5 | P2 | chat | stale response / remount | ✓ (local) |
| 6 | P2 | privacy | redact shallow | ✓ |
| 7 | P2 | admin | canceling null | ✓ |
| 8 | P2 | quality | RESPONSE_FORMAT_HINT dup | ✓ |
| 9 | P2 | auth | `:` em query | ✓ |
| 10 | P2 | docs | Playwright/fixtures drift | ✓ (este log + human pack) |

### Residual obrigatório

B00 remoto · MIG 004 · Stripe/checkout/billing/preços/quotas/webhook/proration · Playwright harness · lock cross-instance · smoke humano · pastoral · deepen persistido · search server-side · WA espiritual

---

## Blocos executados

### F2 (+ F1) — Auth deep-link — `de99916`

Helpers + `safeNextPath` query-aware; testes negativos.

### Entitlements hygiene — `9a23a21`

`resolveEntitlements` só ACTIVE keys.

### F8 Conversão FAQ — `bc38a01`

`CROSS_SURFACE_COMMERCIAL_FAQ` em home/planos/ajuda.

### F11/F12 Redaction + admin null — `c59f6fa`

Nested redaction; canceling null negativo.

### F3 Chat + F6 Aprofundar — `54e4388`

`key` remount, AbortController, help fora do label.

### F5 Jornadas V1.2 — `7016c84`

`mapJourneyCompleteError` 401/403/rede.

### F4 Histórico V3 — `b4b90c4`

`q` preservado + hard-cap notice.

### F7/F9/F13 — `e1f2d3f`

Personalizar → `/conversar`; alerts critical-first; `cache(loadUserSubscriptions)`.

### F10/F11/F14/F15 — (commit fechamento)

Logout limpa drafts; HC anchors `#faq-*` / `#contato`; hint compartilhado; runbook humano mínimo.

---

## Privacidade / LGPD (auditoria local — sem migration)

| Categoria | Finalidade | Onde | Retenção aparente | Acesso | Export | Exclusão | Risco | Necessário? |
|-----------|------------|------|-------------------|--------|--------|----------|-------|-------------|
| Mensagens chat | Produto | DB | Conta ativa | User + service | Sim (conta) | Sem self-service | Médio | Sim |
| Draft composer | UX | sessionStorage | Sessão / logout limpa | Device | Não | Logout limpa | Baixo | Sim (minimizado) |
| Perfil espiritual | Personalização | DB | Conta | User | Sim | Sem self-service | Médio | Sim |
| Jornadas progresso | Continuidade | DB | Conta | User | Sim (ids) | Via reset UI | Baixo | Sim |
| Aquisição UTM | Ops | cookies/intent | Curto | Admin | Não PII sensível | Cookie TTL | Baixo | Sim |
| Logs | Ops | logger | Runtime | Ops | N/A | N/A | Médio se leak | Redact ✓ |
| Health | Ops | `/api/health` | N/A | Público limitado | N/A | N/A | Baixo | Checks seguros |
| Crise | Safety | path chat | Não logar conteúdo | — | — | — | Alto se logar | Intercept; sem log conteúdo |
| Admin | Ops | métricas | Aggregates | Admin | Sem body chat | — | Médio | Sem conteúdo integral |
| Suporte mailto | Ops | client e-mail | Inbox suporte | Ops | — | — | Médio se colar chat | Copy pede mínimo |

**Não prometido:** exclusão self-service de conta (ainda ausente).

---

## Matriz conversão (delta sprint 4)

| Promessa | Plano | Superfície | Real | Consistência | Risco | CTA | Correção |
|----------|-------|------------|------|--------------|-------|-----|----------|
| Troca de plano | todos | home/ajuda/planos | Não auto | **Alinhado** | Baixo | suporte/conta | FAQ compartilhado |
| Aprofundar | Profundo+ | home/ajuda/chat | Ativo | **Alinhado** | Baixo | chat | FAQ + label |
| Jornadas | Caminho+ | home/ajuda/planos | Ativo | **Alinhado** | Baixo | /jornadas | FAQ |
| Memória ampliada | Profundo | roadmap | Reservado | OK cards | — | — | `has()` não concede |
| Portal = troca plano | — | ajuda | Não | **Corrigido** | Médio→Baixo | — | copy portal |

---

## Gates finais

| Gate | Resultado |
|------|-----------|
| `pnpm test:real-usage` | PASS (**81**; baseline 61) |
| `pnpm eval:theology:journeys` | PASS |
| `pnpm eval:theology:ci` | PASS |
| `pnpm launch:check` | PASS |
| `pnpm lint` | PASS (0 erros, 5 warnings preexistentes) |
| `pnpm test` | PASS (**870**; baseline 848) |
| `pnpm build` | PASS |

## Confirmações

- `repositories/index.ts` **nunca** staged/commitado  
- Sem migrations / Stripe / checkout / billing / preços / quotas / webhook / proration / deploy / remoto  
- Playwright **não** instalado  
- Lock cross-instance **residual** (MIG 004)  
- Commits sprint 4: `de99916` → `9a23a21` → `bc38a01` → `c59f6fa` → `54e4388` → `7016c84` → `b4b90c4` → `e1f2d3f` → `ebe9fe1` (+ tip docs se houver)  

