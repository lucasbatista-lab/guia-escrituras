# Amém Chat — Test Coverage and Failure Mode Matrix

**Data:** 2026-07-21
**Tip auditado na entrada:** `358142e`
**Tip de produto validado:** `c03ff10`

---

## 1. Inventário de testes

| Classe | Evidência | Contagem aprox. |
|--------|-----------|-----------------|
| Unitário / integração Vitest | `tests/*.test.ts` | 85+ |
| Real-usage gate | `package.json` `test:real-usage` (18 arquivos) | 108 asserts esperados no baseline |
| Theology eval | `tests/evals/theology/*` + scripts | harness + detectors |
| Journey content eval | `tests/evals/journeys/*` + script | content safety |
| Security local | `local-security-v2/v3`, edge redirects | presente |
| Billing local | stripe-*, checkout-*, plan-promises | presente (sem Stripe live) |
| Migration contract | `persistence-and-migration004.test.ts` | local |
| UI estática / copy | commercial-honesty, help-center, a11y polish | presente |
| E2E browser | Playwright | **não instalado**; spike DEFER |
| Smoke humano | human minimal pack | pendente |
| Coverage % | vitest coverage | **não configurada** |

Baseline de entrada (confirmado pelo operador, não re-provado nesta fase documental até gates de fechamento): 108 real-usage, 906 test, theology PASS, launch:check PASS, lint 0 erros / 5 warnings, build PASS.

---

## 2. O que o número alto esconde

906 testes + 108 real-usage **não** cobrem:

1. Stripe live / webhook prod
2. RLS live pós-004
3. OpenAI qualidade teológica live
4. Browser multi-aba real
5. Pastoral das 21 etapas
6. E-mail deliverability
7. Deploy SHA drift
8. Concorrência cross-instance de chat

`launch:check` prova consistência documental/estática local — **não** prontidão remota (`scripts/launch-check.cjs`).

Theology CI verde ≠ produto teologicamente seguro em produção (evals offline, não wired a `/api/chat`).

---

## 3. Matriz fluxo × falha × cobertura

| Fluxo | Failure modes principais | Cobertura automatizada | Lacuna | Smoke humano |
|-------|--------------------------|------------------------|--------|--------------|
| Visitante / SEO | robots miss `/jornadas`; brand tagline tensão | seo-social-readiness | indexing residual | visual |
| Aquisição UTM | sanitize fail; cookie loss apex/www | acquisition + edge tests | deliverability N/A | admin check |
| Auth | open redirect; deep-link loss; session expire | auth-deep-link, safeNextPath, password | multi-device live | login smoke |
| Ativação | checklist stale SSR | activation-session-checklist | — | first login |
| Chat | stale; abort; not_found; crisis; quota; lock race | chat-reliability, long-session, crisis, real-usage | cross-instance lock; live OpenAI | send+cancel |
| Histórico | hard-cap; busca parcial | history-v4, retention | server search | list+search |
| Jornadas | false complete; paywall; persist fail | journey-* , c03ff10 path, caminho real-usage | pastoral; RLS | residual pack |
| Aprofundar | entitlement; affordance | deep-response, aprofundar-v3 | authority perception | Profundo |
| Planos | honesty drift | commercial-honesty, plan-promises | plan change | pricing page |
| Billing | webhook lag; binding; mode mix | stripe-webhook-hardening, checkout tests | **live smoke** | financial prep |
| Conta/privacy | draft leak; export | composer-draft-privacy, account-export | self-delete | logout |
| Admin | authz; mobile | admin-* tests | MFA; audit trail | mobile ops |
| Cron/report | secret missing; silent miss | launch-operations-reporting | alert external | daily check |

---

## 4. Failure modes críticos — detalhe

### FM-CHAT-LOCK
Dois serverless instances, mesmo `requestId` → possível double OpenAI call.
Mitigação parcial: unique indexes (dependem MIG 004).
Teste: unit process-local only.

### FM-WEBHOOK-LAG
Pago no Stripe, perfil ainda sem plano.
Código: success page `processing` até DB.
Teste local: hardening; **falta** smoke financeiro.

### FM-RLS-PRE004
JWT autenticado pode inserir `usage_events` / messages sem restrição de role (policies 001) se 004 não aplicada.
App mitiga path normal via service role — **não substitui RLS**.
Teste: `persistence-and-migration004` local; remote unproven.

### FM-THEOLOGY-FALSE-GREEN
Evals passam com fixtures; modelo live alucina versículo no texto.
Detectors não escaneiam free-text citations no answer runtime.

### FM-CRISIS-UPSELL
Crisis intercept OK; DeepUpsellHint ainda no composer sob thread de crise.

### FM-DEMO-ADMIN
`DEMO_MODE` + mocks → `isAdmin: true`. Seguro só se nunca em ambiente com dados reais.

---

## 5. Mocks e risco de falso positivo

| Mock | Uso | Risco |
|------|-----|-------|
| Memory repositories | DEMO / testes | Esconde falhas RLS |
| MockAiProvider | DEMO | Sem identity assert |
| Stripe stubs | unit | Esconde misconfig price IDs |
| vi.stubEnv | amplo | Ordem/isolamento |
| DEMO session admin | testes | Falso verde authz |

---

## 6. Playwright — decisão fundamentada

Spike `AMEM_PLAYWRIGHT_E2E_SPIKE_2026-07-21.md`: **DEFER**.

Bloqueios de harness:

- `DEMO_MODE` não desbloqueia mocks sob `next start` como esperado
- persona demo única
- Jornadas precisam Supabase

**Antes do lançamento:** não gastar créditos instalando Playwright.
**Depois:** só com harness process-scoped + fixtures determinísticas + auth test users.

Mitigação atual: Vitest real-usage (108) + smoke humano mínimo.

---

## 7. Confiança real por domínio

| Domínio | Confiança automatizada | Confiança lançamento |
|---------|------------------------|----------------------|
| Copy comercial honesty | Alta | Alta local |
| Chat reliability local | Alta | Média (remoto/AI) |
| Jornadas progress | Alta local | Média (pastoral+remote) |
| Auth deep-links | Alta local | Média (e-mail templates live) |
| Billing | Média local | **Baixa** sem smoke |
| Theology live | Baixa | Baixa até pastoral+spot checks |
| RLS | Média código | **Baixa** sem B00/004 |
| Admin ops | Média | Média |

---

## 8. Testes financeiros necessários antes de implementar troca/proration

1. Checkout Essencial/Caminho/Profundo test mode (valores 38/58/188).
2. Webhook order: session.completed → subscription.updated.
3. Binding user mismatch rejeitado.
4. Cancel at period end + acesso até fim.
5. Reactivate.
6. past_due behavior.
7. Portal session.
8. Key mode mismatch 4xx.
9. Idempotência replay evento.
10. Success page processing → active.
11. Particular **não** checkout.
12. Admin readiness panel coerente.

**Não** implementar proration até esta lista passar em ambiente de teste.

---

## 9. Recomendação de cobertura futura (créditos)

| Prioridade | Ação | Intensidade |
|------------|------|-------------|
| Alta | Manter real-usage ≥108; não reduzir | pequena |
| Alta | Testes negativos extras só se gap confirmado (crise+upsell UI) | média |
| Média | Harness prep Playwright (doc+spike update) sem install | pequena |
| Baixa | Coverage % tooling | não vale agora |
| Bloqueada | Stripe live automation | exige remoto |
