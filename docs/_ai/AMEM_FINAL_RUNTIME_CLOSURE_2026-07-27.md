# AMÉM CHAT — Fechamento final de runtime / segurança / GO-NO-GO

**Data:** 2026-07-27
**Modo:** evidência concreta (sem nova auditoria genérica)
**Estado:** fechamento completo em 2026-07-27 (noite + retomada tarde)

---

## 1. SHA e produção

| Item | Valor |
|------|--------|
| Branch | `main` |
| HEAD | `8b8a7d1` |
| origin/main | `8b8a7d1` |
| `/api/health` version | `8b8a7d1` |
| health status | `ok` |
| `/api/health/db` | `ok` |
| Working tree | CRLF em `src/lib/database/repositories/index.ts` (intocado); untracked docs `_ai` |
| Staged | nenhum |
| lockfile | intacto |
| Next.js | 16.2.11 (baseline informado) |

---

## 2. Regressão pública C01–C09

Sessão anônima Playwright (headless). Rotas 200; overflow 320/375/390/430 = 0; console errors = 0; 4xx/5xx inesperados = 0.

| Check | Resultado |
|-------|-----------|
| C01 cadastro?plan= | PASS |
| C02 FAQ Essencial/Caminho/Profundo | PASS |
| C03 Aprofundar sem Se X/Se Y | PASS |
| C04 Aprofundar vs cancelamento renovação | PASS |
| C05 “nesta etapa” nas etapas | PASS (catálogo pode usar “por etapa” como média) |
| C06 sem “composer” no copy consumidor | PASS |
| C07 “Cancele a renovação…” | PASS |
| C08 preview 2 de 7 / etapa 3 | PASS |
| C09 Uso justo PT natural | PASS |
| Preços 38/58/188; Caminho destacado; Particular separado | PASS |
| Sem “mais popular”; sem H1 “Como Jesus…” | PASS |

---

## 3–7. Conta Profundo

Conta: `llggbb1@gmail.com` · plano Profundo · ativa · R$ 188.

| Teste | Status | Evidência |
|-------|--------|-----------|
| `/conta` | PASS | Profundo / ativa / 188 / Jornadas / Aprofundar |
| `/planos` autenticado | PASS | CTAs → `/conta` “Gerenciar assinatura”; 0 `cadastro?plan=` |
| Chat normal (2 turns) | PASS | `/api/chat` 200; refs; histórico após refresh |
| Aprofundar UI | PASS | botão; placeholder específico; cancelar; reativar |
| Aprofundar send | PASS | 200; answerLen ~4k; tensões; não incompleto-como-sucesso |
| Crise | PASS | `safetyMode=crisis`; provider `mock`; tokens 0; 188/192; sem Aprofundar; sem refs |
| Pós-crise normal | PASS | nova conversa não contaminada |
| Jornadas (3) 1 etapa | PASS | complete 200 nas testadas; “etapa X de 7”; “nesta etapa” |
| Jornada integral Ansiedade | PASS | 7/7; `completedAt` set; UI “7 de 7 concluídas” / Rever |
| Reset cancel + confirm | PASS | reset 200; reuso 200 |
| Admin | INFO | Conta **é admin legítimo** (`admin_roles`); navegação read-only; sem PII copiada |

---

## 8–10. Conta Essencial + gating + Admin

Conta: `llucasbbatista@hotmail.com` · Essencial · ativa · R$ 38.

| Teste | Status | Evidência |
|-------|--------|-----------|
| Chat | PASS | 200; sem botão Aprofundar; sem upsell agressivo; histórico ok |
| `/jornadas` | PASS | gate honesto Caminho/Profundo; 0 links de etapa; 0 RPC progresso |
| URL direta de etapa | PASS | redirect `/jornadas`; sem conclusão; sem leak sensível |
| `preferDeep` server-side | PASS (testes) | `deep-response-on-demand` 18/18; Essencial → 403 |
| `/planos` | PASS | Gerenciar assinatura; 0 checkout novo |
| `/admin` | PASS | redirect `/inicio`; sem métricas admin |

---

## 11. Ordem crise / assinatura

Ordem real no código (`route` → `runChatTurn`):

1. Auth (401)
2. Payload/size/validation (400)
3. Subscription/`planKey` (402)
4. `chat_standard` (403)
5. **Crise** (template; sem OpenAI; sem budget)
6. Budget/burst/rate + provider

| Caso | Resultado |
|------|----------|
| A não autenticado + crise | Código: 401. Teste combinado: NÃO VERIFICADO |
| B ativo + budget esgotado + crise | PASS (`crisis-safety` 20/20) |
| C assinatura inativa + crise | Código: 402 antes da crise. Combo: NÃO VERIFICADO |
| D sem `chat_standard` + crise | Código: 403 antes. Combo: NÃO VERIFICADO |
| E payload grande + crise | Size primeiro (400). Combo: NÃO VERIFICADO |
| F payload inválido + crise | Validação primeiro. Combo: NÃO VERIFICADO |

Decisão pastoral pendente (amanhã): se crise deve furar 402/403 de assinatura.

---

## 12. Postcheck MIG 012

Campo falso: **`plpgsql_vars_present=false`** (único).
Demais (grants, RLS, policies, containment, security_invoker) = true.
`overall_ok=false` só por esse campo.

**Classificação:** falso negativo estrutural do postcheck — regex usa `\b`, que no PostgreSQL é *backspace*, não word-boundary.
Runtime de Jornadas em produção: PASS (7/7 + `completedAt`).
**Não criar migration.** Correção futura do postcheck apenas.

---

## 13. MIG 004

| Etapa | Status |
|-------|--------|
| Precheck | PASS (`preconditions_ok` / `overall_ok`) — estado já era pós-004 |
| Aplicação humana | Feita (reaplicação idempotente / Success) |
| Postcheck | PASS (`overall_ok=true`) após correção de typos no SQL auxiliar |
| Smoke transacional | PASS (`overall_ok=true`, 6/6) — forge assistant/usage/cross-user bloqueados; legítimo OK; ROLLBACK |
| Smoke app pós-004 | PASS — ver §13.1 |

Observação precheck: policies/índices já no estado final antes da reaplicação; reaplicar reforçou funções + `search_path`.

### 13.1 Smoke app pós-MIG 004

Produção ainda `8b8a7d1`. Sem 401/403 indevidos, 500/503, 42501, 42883.

| Conta | Ação | Resultado |
|-------|------|-----------|
| Profundo | chat normal | `/api/chat` 200 |
| Profundo | Aprofundar | `/api/chat` 200, answerLen ~3.7k |
| Profundo | concluir etapa Jornada | `/api/journeys/progress/complete` 200 |
| Essencial | chat normal | 200; sem Aprofundar |
| Essencial | gate Jornada + URL direta | redirect `/jornadas`; 0 complete; 0 RPC |

---

---

## 14. Vulnerabilidades residuais (`pnpm audit --prod`)

| Pacote | Severidade | Cadeia | Nota |
|--------|------------|--------|------|
| sharp | high | next→sharp | CVEs libvips; patch via sharp≥0.35 / Next |
| postcss | high ×2 | next→postcss | GHSA sourceMappingURL |
| postcss | moderate | next→postcss | XSS stringify |

Sem upgrade nesta sessão. Aplicabilidade: build-time / toolchain Next; não abrir frente agora. Pós-lançamento: acompanhar release Next.

Headers produção (home): HSTS, CSP, X-CTO, Referrer-Policy, Permissions-Policy presentes. Cache-Control público na home (esperado).

---

## 15. Console / Network

- Público: limpo
- Profundo / Essencial smokes: sem 500/503/42883 observados; console limpo nos relatórios
- Pós-MIG 004 app smoke: **executado** e verde — sem erros RLS; sem 42501; sem 42883; sem 5xx (ver §13.1)

---

## 16. P0

Nenhum P0 novo comprovado no runtime testado.

---

## 17. P1

1. Corrigir postcheck 012 (`\b` → âncoras POSIX)
2. Decisão pastoral: crise vs assinatura inativa / sem `chat_standard`
3. Residual audit sharp/postcss via Next
4. Conta Profundo é admin — confirmar se intencional para produção
5. Registrar MIG 004 como aplicada no runbook de DB — **feito** (`DATABASE.md` + handoff)

---

## 18. Não verificados

- Casos C/D crise combinados (assinatura inativa / sem `chat_standard`)
- Mobile overflow autenticado detalhado
- Conta Caminho dedicada (só Essencial + Profundo)
- Crise repetida no smoke pós-004 (já validada na noite; não reenviada)

---

## 19. Veredito

### GO

**Por quê (≤10 linhas):**
Produção = `8b8a7d1`. C01–C09 verdes. Profundo: chat, Deep, crise mock, Jornadas 7/7+reset OK. Essencial gated + Admin negado. Crise ignora budget (testado). Postcheck 012 sem falha real de RLS/grants. MIG 004 aplicada, postcheck e smoke transacional 6/6 verdes. Smoke app pós-004: chat/Deep/Jornada/Essencial sem RLS errors. Nenhum P0 novo.

---

## 20. Checklist pós-GO (≤10)

### Obrigatório antes do primeiro vídeo com CTA
1. Conferir `/api/health` ainda em `8b8a7d1` no momento da gravação
2. Smoke manual rápido: 1 chat Profundo + abrir `/planos` autenticado
3. Confirmar links de CTA do vídeo apontam para `/planos` ou `/cadastro?plan=...` corretos
4. Não alterar Stripe/planos/copy sem revalidar honesty gaps

### Pode depois do lançamento
5. Patch postcheck 012 (`plpgsql_vars_present` / `\b`)
6. Testes combinados crise + assinatura inativa / entitlement
7. Plano residual sharp/postcss via Next
8. Revisar se conta Profundo deve permanecer admin
9. Doc: MIG 004 aplicada em produção no runbook — **feito**
10. Monitorar 500/RLS nas primeiras horas de tráfego real

---

## Confirmações desta sessão

- Nenhum código de produto editado
- Nenhum push / deploy manual nesta sessão de fechamento
- Nenhum Stripe / pagamento / cancelamento
- Nenhuma senha armazenada; PII mínima evitada no relatório
- `repositories/index.ts` intocado
- lockfile intacto
- Relatório reconciliado no fechamento documental (handoff + `DATABASE.md`)
- Terminais/browser keepalives de login encerrados ao fechar a noite

## Evidências auxiliares

`.tmp-runtime-closure/`: `mig004-transactional-smoke.sql`, `mig004-postcheck-readonly.sql`, `phase6-app-smoke.json`, `phase6-journey-complete.json`, `phase2-*.json`, `phase3-essencial.json`, `phase1-public.json` (locais; **não** commitadas)
