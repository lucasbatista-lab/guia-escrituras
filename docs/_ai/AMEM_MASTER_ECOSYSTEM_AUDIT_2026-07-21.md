# Amém Chat — Master Ecosystem Audit

**Data:** 2026-07-21
**Tip auditado na entrada:** `358142e`
**Tip de produto validado:** `c03ff10`
**Tipo:** auditoria-mestre investigativa — **somente documentação**; sem implementação.
**Companions:** `AMEM_ARCHITECTURE_…`, `AMEM_SECURITY_…`, `AMEM_TEST_COVERAGE_…`, `AMEM_UNREQUESTED_GAPS_…`, `AMEM_REMAINING_CURSOR_CREDITS_…`, `AMEM_AUDIT_COVERAGE_LEDGER_…`

---

## 1. Estado inicial (Fase 0 — provado)

| Check | Resultado |
|-------|-----------|
| Branch | `main` |
| HEAD | `358142e1fbd74775dafc94e151241e7ad366d098` |
| `origin/main` | idêntico a HEAD |
| Ahead/behind | `0 0` (sem commit local sem push) |
| Staged | vazio |
| Working tree | só `M src/lib/database/repositories/index.ts` |
| Diff conteúdo desse arquivo | **vazio** (aviso CRLF only) |
| `c03ff10` ancestor | sim (`merge-base --is-ancestor` exit 0) |
| Histórico `repositories/index.ts` | último conteúdo em `485f385` — **não** introduzido nas sprints 1–5 |
| Último commit | `docs: reconcile sprint five final state` |
| Correção produto recente | `c03ff10` falsa celebração Jornada |

**Regra desta auditoria:** esse arquivo CRLF **não** foi modificado, normalizado, staged nem commitado.

Baseline de gates (entrada, reportado pelo operador): real-usage 108, test 906, theology journeys+CI PASS, launch:check PASS, lint 0/5w, build PASS.

---

## 2. Metodologia

Inventário completo (ledger) → verdade de produto → incompleteness scan → fluxos A–K → IA/teologia → threat model → LGPD → DB → Stripe → infra → obs → testes → perf → a11y → SEO → editorial → DevEx → ops comerciais → reconciliação docs → gaps nunca solicitados → priorização → plano de créditos.

Todo finding abaixo tem evidência em arquivo. Itens já resolvidos nas sprints **não** reaparecem como abertos.

---

## 3. Sumário executivo

O Amém Chat está **localmente maduro** em chat, Jornadas (com correção `c03ff10`), honesty comercial, auth deep-links, admin mobile, help, privacy storage, e gates automatizados. **Não está pronto para declarar lançamento fechado:** pagamentos sem smoke live, B00/MIG 004 remotos, pastoral humano, e gaps de incidente/ops nunca pedidos.

**Não é sexta sprint de implementação.** O maior retorno dos créditos restantes é: (1) humanos remotos na ordem certa, (2) poucos fixes locais de alto risco reputacional (crise×upsell), (3) docs que hoje contradizem código, (4) prep 004/financeiro — **não** Playwright, features roadmap ou refactors.

### Contagem de findings

| Severidade | Qtd |
|------------|-----|
| P0 | 3 |
| P1 | 12 |
| P2 | 14 |
| P3/P4 | 8 |
| Falsos positivos / dívida aceita documentada | ver §5 |
| Hipóteses a validar | 4 |

Preços confirmados no código: **R$38 / R$58 / R$188** (`plans.ts` cents 3800/5800/18800). Particular sem checkout pastoral WhatsApp. Aprofundar copy nega superioridade espiritual. Stripe **não** declarado pronto. RLS live **não** validado. MIG 004 **não** aplicada. Deploy **não** realizado nesta auditoria.

---

## 4. Inventário (resumo)

Ver `AMEM_AUDIT_COVERAGE_LEDGER_2026-07-21.md`.

- 38 pages (16 public / 13 auth / 9 admin)
- 21 route handlers (+ 2 auth callbacks)
- 8 server actions; proxy edge; 0 middleware.ts
- 8 migrations; 2 postchecks
- 93 test files; real-usage gate 18 files
- 0 feature-flag framework; `DEMO_MODE` + persona flags
- `pnpm audit --prod`: 1 high (sharp via next), 1 moderate (postcss)

---

## 5. Verdade do produto (matriz condensada)

| Promessa | Implementação | Teste | Humano | Remoto | Doc | Status real |
|----------|---------------|-------|--------|--------|-----|-------------|
| Essencial chat R$38 | `chat_standard` + budget | plan-promises, entitlements | — | Stripe | COMMERCIAL_PLANS | Pronto local; $ remoto |
| Caminho Jornadas R$58 | `reading_journeys` | caminho real-usage | pastoral pendente | 008 aplicada (doc) | READING_JOURNEYS | Pronto local; pastoral aberto |
| Profundo Aprofundar R$188 | `chat_deep` on-demand | deep-response, aprofundar-v3 | smoke Profundo | OpenAI $ | reserved disclaimers | Pronto local UX |
| Particular | request_access; sem pastoral WA | commercial honesty | ops WA | — | planos/mensagens | Honest local |
| Troca de plano | **Ausente** (copy “ainda não”) | honesty | — | — | COMMERCIAL_PLANS | Roadmap bloqueado |
| Voz/áudio/memória estendida | reserved | plan-promises bloqueia venda | — | — | reserved.ts | Roadmap |
| Streaming / delete account / search server | ausente / suporte | — | — | — | NEXT_STEPS | Pós-lançamento |
| short_memory “Ativo” em plan matrix | comportamento universal, key reserved | — | — | — | plan matrix desatualizada | Doc drift |

---

## 6. Findings consolidados

### P0

#### MAE-P0-01 — MIG 004 não aplicada (RLS forge residual)
- **Domínio:** banco / segurança
- **Severidade:** P0 · **Confiança:** confirmada (código+doc; remoto “não aplicada”)
- **Estado atual:** policies de insert frouxas da 001 podem permanecer; 004 no disco remove insert autenticado em `usage_events` e restringe messages a `role=user`
- **Esperado:** hardening aplicado ou risco aceito explicitamente por escrito
- **Evidência:** `docs/DATABASE.md:12,34-42`; `supabase/migrations/20260712000004_production_hardening.sql:14-63`
- **Fluxo:** qualquer cliente com JWT + PostgREST
- **Impacto usuário:** baixo no path app normal; alto se atacante abusar API Supabase
- **Impacto lançamento:** bloqueador remoto
- **Comercial:** risco reputação/fraude usage
- **Segurança:** alta
- **Reprodução:** requer projeto remoto (não executado)
- **Cobertura:** `persistence-and-migration004.test.ts` local; **ausente** live
- **Solução:** exige migration + remoto + operação humana
- **Pré-requisitos:** B00, backup
- **Risco correção:** médio (apply cuidadoso)
- **Esforço:** ops médio · **Prioridade:** máxima remota · **Bloco:** B1 + humano

#### MAE-P0-02 — Pagamentos não prontos para lançamento
- **Domínio:** Stripe / billing
- **Severidade:** P0 launch · **Confiança:** confirmada
- **Estado:** checkout/webhook/cancel/portal **implementados** localmente; smoke live **não** executado; matriz “Não pronto”
- **Esperado:** smoke financeiro test + envs live coerentes antes de cobrar
- **Evidência:** `AMEM_FINAL_LAUNCH_READINESS_MATRIX:21`; `AMEM_FINANCIAL_SMOKE…:69-73`; código `src/lib/stripe/*`
- **Fluxo I**
- **Impacto:** cobrança indevida / acesso sem pagamento / oposto
- **Solução:** exige financeiro + remoto
- **Não implementar proration** até smoke
- **Bloco:** C1 + humano smoke

#### MAE-P0-03 — B00 remoto não confirmado (005–007 + SHA)
- **Domínio:** ops / DB
- **Severidade:** P0 process · **Confiança:** confirmada documentalmente
- **Estado:** 005–007 “Provável”; health SHA cutover não provado nesta sessão
- **Evidência:** `DATABASE.md:13-15`; `NEXT_STEPS.md:30-36`; human minimal pack
- **Solução:** exige remoto / operação humana
- **Bloco:** humano #1–2

---

### P1 (máx. 20 — top 12)

#### MAE-P1-01 — Upsell Aprofundar visível sob thread de crise
- **Domínio:** IA / teologia / UX
- **Confiança:** confirmada
- **Estado:** crisis intercept evita modelo; `DeepUpsellHint` ainda no composer
- **Esperado:** sem CTA comercial de deepen em contexto de crise
- **Evidência:** `chat-service.ts` crisis ~347+; `chat-panel.tsx` deepen/upsell ~480–536; `chat-plan-upsell.tsx:69-84`
- **Impacto lançamento:** reputacional alto
- **Solução:** local com teste
- **Esforço:** pequeno-médio · **Bloco:** A1

#### MAE-P1-02 — Docs cookie host-only vs Domain compartilhado
- **Domínio:** auth / docs
- **Confiança:** confirmada
- **Estado:** código `domain: ".amemchat.com.br"` em Vercel Production; checklist/templates pedem host-only
- **Evidência:** `src/lib/supabase/auth-cookie-options.ts:22-25`; `LAUNCH_CHECKLIST.md:40`; `AUTH_EMAIL_TEMPLATES.md:262-264`
- **Risco:** ops “corrigir” código na direção errada
- **Solução:** atualização documental
- **Bloco:** D1

#### MAE-P1-03 — Lock de chat só process-local
- **Domínio:** confiabilidade / custo AI
- **Confiança:** confirmada
- **Evidência:** `src/lib/ai/chat-turn-lock.ts:1-7`
- **Mitigação parcial:** unique indexes na 004
- **Solução:** exige migration (lease DB) ou aceitar com 004
- **Bloco:** B + aceitar até 004

#### MAE-P1-04 — Exclusão de conta self-service ausente
- **Domínio:** privacidade LGPD
- **Confiança:** confirmada
- **Evidência:** `privacidade` copy suporte; `USER_DATA_PORTABILITY.md:96-105`
- **Solução:** exige jurídico + operação; self-service pós
- **Bloco:** D3

#### MAE-P1-05 — THEOLOGY_EVALUATIONS desatualizado (crisis prompt-only)
- **Domínio:** docs / teologia
- **Confiança:** confirmada
- **Evidência:** `THEOLOGY_EVALUATIONS.md:26` vs `AI_AND_THEOLOGY.md:20` + código
- **Solução:** doc
- **Bloco:** D1

#### MAE-P1-06 — Runbooks de incidente incompletos para 20 cenários ops
- **Domínio:** SRE / suporte
- **Confiança:** confirmada (parcial: cutover + financial prep existem; sem playbook unificado)
- **Solução:** docs ops
- **Bloco:** F1

#### MAE-P1-07 — E-mail deliverability não validada
- **Domínio:** auth
- **Confiança:** confirmada checklist unchecked
- **Evidência:** `LAUNCH_CHECKLIST.md:50-54`
- **Solução:** operação humana
- **Bloco:** humano

#### MAE-P1-08 — Revisão pastoral 21 etapas pendente
- **Domínio:** editorial / teologia
- **Confiança:** confirmada
- **Evidência:** human blockers / NEXT_STEPS
- **Solução:** exige revisão pastoral
- **Bloco:** humano

#### MAE-P1-09 — Alucinação de versículo em texto livre
- **Domínio:** IA
- **Confiança:** confirmada gap
- **Estado:** refs estruturadas filtradas; answer free-text não escaneado
- **Evidência:** `AI_AND_THEOLOGY.md:26`; grounding filter
- **Solução:** local com teste (detector) **ou** aceitar + pastoral spot-check
- **Prioridade:** alta pós A1; não bloquear se pastoral cobrir
- **Bloco:** D/H

#### MAE-P1-10 — DEMO_MODE admin em preview
- **Domínio:** segurança
- **Confiança:** confirmada código
- **Evidência:** session demo `isAdmin: true` quando mocks
- **Solução:** operação (nunca dados reais) + doc
- **Bloco:** F2

#### MAE-P1-11 — Supply-chain sharp high (via next)
- **Domínio:** dependências
- **Confiança:** confirmada `pnpm audit --prod`
- **Solução:** investigar; não bump cego lockfile
- **Bloco:** G3

#### MAE-P1-12 — Tagline “Como Jesus responderia…” vs disclaimers de IA
- **Domínio:** marca / teologia
- **Confiança:** confirmada
- **Evidência:** `src/config/brand.ts:29`
- **Solução:** exige decisão de produto + pastoral
- **Bloco:** pastoral

---

### P2 (agrupados)

| ID | Título | Evidência | Solução | Bloco |
|----|--------|-----------|---------|-------|
| MAE-P2-01 | Drafts sem userId se logout pulado | `composer-draft.ts:2-11` | local+teste | E1 |
| MAE-P2-02 | robots sem `/jornadas` | `robots.ts:29-48` | local+teste | A3 |
| MAE-P2-03 | CSP `unsafe-inline` | `next.config.ts` | pós | H |
| MAE-P2-04 | Stable error codes incompletos | `stable-error-codes.ts:6-30` | local+teste | A2 |
| MAE-P2-05 | Health não prova Stripe/OpenAI | `api/health` | aceitar/docs | F3 |
| MAE-P2-06 | Admin sem MFA / audit trail | ausência | pós/aceitar | H |
| MAE-P2-07 | Sem kill switch de features | ausência | local env | D2 |
| MAE-P2-08 | Receita Stripe null no admin | `admin/metrics` | financeiro remoto | H |
| MAE-P2-09 | Evals theology não wired `/api/chat` | THEOLOGY_EVALUATIONS | aceitar+doc | — |
| MAE-P2-10 | Chat scroller sem aria-live | mobile-a11y test intencional | decisão a11y | E |
| MAE-P2-11 | Admin mobile nav sem focus trap | `admin-mobile-nav.tsx` | local | E |
| MAE-P2-12 | Plan matrix short_memory drift | plan value doc vs reserved | doc | D1 |
| MAE-P2-13 | Playwright doc antigo “seguro agora” | automated real-usage plan | doc obsolete | G |
| MAE-P2-14 | Sem CI `.github` | ausência | pós | H |

---

### P3/P4

| ID | Título | Notas |
|----|--------|-------|
| MAE-P3-01 | Renomear “Aprofundar” | residual opcional NEXT_STEPS |
| MAE-P3-02 | Essencial `?bloqueado=1` | não implementado; paywall atual OK |
| MAE-P3-03 | Chips tema só em `/inicio` | residual produto |
| MAE-P3-04 | Streaming chat | pós |
| MAE-P3-05 | Search server-side histórico | pós |
| MAE-P3-06 | Deepen persistido | pós |
| MAE-P3-07 | Virtualização lista chat 200 msgs | otimização prematura até escala |
| MAE-P4-01 | PWA / i18n / voz / afiliados | roadmap/ausente — não gastar |

---

### Hipóteses a validar (remoto)

1. 005–007 realmente presentes em produção.
2. SHA de produção == tip escolhido.
3. Explorabilidade prática do CVE sharp no runtime Vercel deste app.
4. Taxa real de alucinação de versículos com `OPENAI_MODEL_*` de produção.

### Dívidas aceitas / falsos positivos

- Memory/Mock AI só com `allowsMocks()` (prod false).
- console em logger/error boundaries.
- 503 fail-closed Stripe/cron/OpenAI misconfig.
- Empty catches fail-soft em storage.
- `placeholder=` UI.
- test.skip/only: **nenhum**.
- Preços/quotas: **não alterar**.

### Residuais conhecidos (não re-auditar como novidade)

Aprofundar rename; drafts user-scope; `?bloqueado=1`; chips empty chat — impacto confirmado baixo-médio; ver P3/P2-01.

---

## 7. Reconciliação documental (conflitos)

| Afirmação | Doc | Código | Estado |
|-----------|-----|--------|--------|
| Crisis só prompt | THEOLOGY_EVALUATIONS | intercept runtime | **contraditório — corrigir doc** |
| Cookies host-only | LAUNCH_CHECKLIST / AUTH_EMAIL | Domain `.amemchat.com.br` | **contraditório — corrigir doc** |
| Pagamentos implementados | DEPLOYMENT | sim local | OK se ≠ “launch ready” |
| Pagamentos não prontos | matriz final | — | **correto** |
| 008 aplicada | DATABASE / NEXT_STEPS | — | documentado; não re-provado aqui |
| 004 não aplicada | DATABASE | migration on disk | **correto** |
| Playwright seguro agora | real-usage plan antigo | spike DEFER | **obsoleto** |
| short_memory Ativo | plan matrix | reserved | **drift** |
| Guia Cristão title | expectativa audit prompt | seoTitle diferente | marca ≠ prompt |

**Não atualizar esses docs nesta execução** além dos sete novos arquivos; correções entram no Prompt 2.

---

## 8. Lançamento — o que bloqueia

### Locais (eng, se quiser endurecer antes)
- MAE-P1-01 crise×upsell
- Docs perigosos P1-02/P1-05

### Remotos / humanos
- B00, MIG 004 decisão, pastoral, smoke Jornadas, smoke financeiro, deliverability e-mail, SHA health

### Migration
- 004 (humano)

### Financeiro
- Smoke test; sem proration; receita admin depois

### Pastoral / jurídico
- 21 etapas; tagline; exclusão/retenção; NF

### Pós-lançamento
- Streaming, delete self-service, search SS, deepen persist, MFA, CI, observability externa

---

## 9. Decisões recomendadas

1. **Não** declarar lançamento fechado.
2. Executar sequência humana 1–5 do plano de créditos **antes** de features.
3. Gastar próximos créditos Cursor em A1 → D1 → C1 → B1.
4. **Não** instalar Playwright agora.
5. **Não** tocar `repositories/index.ts`.
6. Aceitar lock cross-instance até 004+lease consciente.
7. Particular permanece canal não pastoral.

---

## 10. Validação desta auditoria

- Findings com evidência: sim
- Sem duplicar sprints resolvidas como abertas: sim
- Remotos não fingidos locais: sim
- Preços 38/58/188: sim
- Sem secrets/PII/espiritual pessoal nos docs: sim
- Sem afirmar Stripe pronto / RLS live / 004 applied / deploy done / launch closed: sim

Gates de fechamento: executados na Fase 26 (registrar resultados no commit message / saída final).
