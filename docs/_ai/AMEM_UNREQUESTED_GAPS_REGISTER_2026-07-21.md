# Amém Chat — Unrequested Gaps Register

**Data:** 2026-07-21
**Tip auditado na entrada:** `358142e`
**Tip de produto validado:** `c03ff10`

Fase 20 obrigatória: gaps que as sprints anteriores **não** trataram de forma suficiente, ligados ao produto real — não checklist genérico.

---

## Como ler

| Classificação | Significado |
|---------------|-------------|
| EXECUTAR (prep) | Preparar docs/código local sem remoto |
| EXECUTAR (remoto) | Só humano/ops |
| ACEITAR | Risco consciente até pós-lançamento |
| DESCARTAR | Não gastar créditos agora |
| JURÍDICO / PASTORAL | Fora de engenharia pura |

---

## Registro

### UG-01 — Backup / restore / RTO / RPO
**Por que não apareceu:** sprints focaram produto e gates locais.
**Evidência de ausência:** sem runbook de restore; “backup” só como pré-condição narrativa da MIG 004.
**Relevância launch:** Alta se 004 for aplicada; média para cutover deploy-only.
**Decisão:** EXECUTAR (remoto) — Ops documentar backup Supabase antes de 004; definir RTO/RPO mínimos.

### UG-02 — Rotação de secrets
**Evidência:** sem runbook de rotação (Stripe, OpenAI, CRON, service role).
**Relevância:** Alta operacional contínua.
**Decisão:** EXECUTAR (prep doc) pós cutover imediato; ACEITAR no dia 0 se secrets frescos.

### UG-03 — E-mail deliverability (SPF/DKIM/bounce)
**Evidência:** `LAUNCH_CHECKLIST.md` itens unchecked; templates em `AUTH_EMAIL_TEMPLATES.md`.
**Relevância launch:** Alta (confirmação/reset).
**Decisão:** EXECUTAR (remoto/humano).

### UG-04 — MFA para admin
**Evidência:** `admin_roles` existe; sem TOTP/MFA no código/docs.
**Relevância:** Alta se poucos admins com PII.
**Decisão:** ACEITAR curto prazo com senha forte + acesso mínimo; EXECUTAR pós-lançamento ou pré se risco aceito baixo demais.

### UG-05 — Kill switch / feature disable isolado
**Evidência:** sem flags para desligar Chat, Jornadas ou Aprofundar independentemente.
**Relevância:** Alta em incidente de custo AI ou teologia.
**Decisão:** EXECUTAR (prep) — flag env simples documentada (intensidade média); não overbuild LaunchDarkly.

### UG-06 — Status page / SLA
**Evidência:** ausência total.
**Relevância launch:** Baixa.
**Decisão:** DESCARTAR pré-lançamento; ACEITAR pós.

### UG-07 — Chargeback / dispute / fraude
**Evidência:** zero menções chargeback em docs; webhook trata `invoice.payment_failed` / subscription states, não disputes.
**Relevância:** Alta pós primeiras cobranças.
**Decisão:** EXECUTAR (prep doc financeiro) após smoke; não implementar código agora.

### UG-08 — Licença / atribuição bíblica
**Evidência:** corpus e jornadas usam paráfrases (`corpus-v1.ts`); checklist pós-lançamento fonte licenciada.
**Relevância launch:** Média (risco IP cresce com escala).
**Decisão:** ACEITAR no launch com paráfrase; EXECUTAR pastoral/jurídico para fonte futura.

### UG-09 — Staging dedicado
**Evidência:** preview Vercel + DEMO_MODE; sem projeto staging documentado.
**Relevância:** Média (risco preview→prod keys).
**Decisão:** EXECUTAR (ops) garantir preview ≠ prod secrets; staging formal ACEITAR pós.

### UG-10 — Admin audit trail
**Evidência:** sem tabela/log de ações admin.
**Relevância:** Média LGPD/ops.
**Decisão:** ACEITAR launch; EXECUTAR pós se equipe >1 admin.

### UG-11 — Consentimento versionado
**Evidência:** **presente** (`legal.ts` + `legal/consent.ts`).
**Decisão:** manter; não gap.

### UG-12 — Política de retenção / purge automatizado
**Evidência:** export sim; delete self-service não; sem job de retenção (`USER_DATA_PORTABILITY.md`).
**Relevância launch:** Alta compliance narrativa.
**Decisão:** JURÍDICO + EXECUTAR (prep) processo manual de exclusão; self-service pós.

### UG-13 — www × apex sessões
**Evidência código:** Domain `.amemchat.com.br` em Vercel Production (`auth-cookie-options.ts:22-25`) + redirect www→apex.
**Evidência docs:** ainda pedem host-only em checklist/templates — **contradição**.
**Relevância:** Alta se docs forem seguidas e quebrarem o compartilhamento.
**Decisão:** EXECUTAR (doc fix) — alinhar docs ao código; não “corrigir” Domain sem decisão.

### UG-14 — Robots `/jornadas` vs `/jornada`
**Evidência:** `robots.ts` disallows `/jornada` mas não `/jornadas`; platform layout tem `noindex` meta.
**Relevância:** Baixa-média (meta mitiga).
**Decisão:** EXECUTAR local pequeno (robots) quando créditos de polish.

### UG-15 — Brand title “Guia Cristão”
**Evidência:** SEO real = “Amém Chat | Reflexões cristãs…” (`brand.ts:31`); tagline default “Como Jesus responderia…”.
**Relevância:** Média (expectativa espiritual / SEO).
**Decisão:** PASTORAL + produto decidir tagline; não mudar sem revisão.

### UG-16 — Observabilidade de negócio / alerta de custo externo
**Evidência:** alertas admin locais de custo dia; sem Datadog/Sentry/PagerDuty.
**Relevância:** Média.
**Decisão:** ACEITAR launch com admin diário; agregação externa pós (`NEXT_STEPS`).

### UG-17 — Reconciliação financeira / impostos / NF
**Evidência:** receita Stripe null no admin; sem NF.
**Relevância:** Alta compliance BR.
**Decisão:** JURÍDICO/Fin ops; DESCARTAR créditos eng até smoke.

### UG-18 — Key-person / offboarding / acesso emergencial
**Evidência:** docs assumem operador fundador; sem matriz de acessos.
**Relevância:** Alta continuidade.
**Decisão:** EXECUTAR (humano) lista de acessos Vercel/Supabase/Stripe/OpenAI/DNS.

### UG-19 — Conta comprometida / mudança de e-mail / fusão de contas
**Evidência:** fluxos Auth padrão; sem productização de merge/compromisso.
**Relevância:** Média.
**Decisão:** ACEITAR; runbook suporte manual.

### UG-20 — Manutenção programada / comunicação de incidente / breach response
**Evidência:** cutover/rollback deploy; sem status/comms templates.
**Relevância:** Média.
**Decisão:** EXECUTAR (prep doc curto) na trilha F.

### UG-21 — Deepen upsell sob crise (produto×teologia)
**Evidência:** crisis intercept OK; `DeepUpsellHint` permanece no composer (`chat-panel` + `chat-plan-upsell`).
**Por que não fechado:** sprints trataram intercept e honesty, não a combinação visual.
**Relevância launch:** Alta reputacional.
**Decisão:** EXECUTAR local (trilha A/D) — ocultar upsell deepen em contexto de crise.

### UG-22 — Catálogo incompleto de stable error codes
**Evidência:** `stable-error-codes.ts` lista chat/journey subset; códigos como `ai_identity_violation`, `personalization_required` etc. existem no fluxo mas fora do catálogo.
**Relevância:** Média ops/suporte.
**Decisão:** EXECUTAR local pequena.

### UG-23 — Supply-chain sharp/postcss
**Evidência:** `pnpm audit --prod` → sharp high (via next), postcss moderate.
**Relevância:** Média (explorabilidade no runtime Next).
**Decisão:** EXECUTAR (investigar) sem bump cego de lockfile; acompanhar Next release.

### UG-24 — Cookie Domain docs vs código
Ver UG-13. Finding documental P1.

### UG-25 — THEOLOGY_EVALUATIONS afirma crisis prompt-only
**Evidência:** `THEOLOGY_EVALUATIONS.md:26` vs runtime intercept + `AI_AND_THEOLOGY.md`.
**Decisão:** EXECUTAR (doc fix) — evita falso mental model.

### UG-26 — Plan matrix marca short_memory Ativo
**Evidência:** `AMEM_PLAN_VALUE…` vs `RESERVED_ENTITLEMENT_KEYS`.
**Decisão:** EXECUTAR (doc) ou ACEITAR com nota de que memória curta é comportamento universal não entitlement.

### UG-27 — Playwright “seguro agora” em doc antigo
**Evidência:** `AMEM_AUTOMATED_REAL_USAGE…` vs spike DEFER.
**Decisão:** marcar obsoleto na próxima edição de docs; DESCARTAR install.

### UG-28 — Health superficial
**Evidência:** `/api/health` = runtime + supabase public env; `/api/health/db` = select plans. Sem OpenAI/Stripe.
**Decisão:** ACEITAR com disciplina de não usar health como prova financeira; opcional enriquecer pós.

### UG-29 — Ausência de `public/` e manifest PWA
**Evidência:** assets via `icon.tsx` / OG routes; sem PWA.
**Decisão:** DESCARTAR PWA; ACEITAR assets gerados.

### UG-30 — CI GitHub Actions ausente
**Evidência:** sem `.github/`. Gates rodam local/Cursor.
**Relevância:** Média qualidade contínua.
**Decisão:** ACEITAR short-term; EXECUTAR CI mínimo pós-lançamento.

---

## Resumo de decisão

| Executar antes/durante launch | Aceitar | Descartar créditos agora |
|-------------------------------|---------|---------------------------|
| UG-01 (backup antes 004), UG-03, UG-13/24 docs, UG-21, UG-18 acessos, UG-07 playbook, UG-05 kill switch simples | UG-04 MFA curto, UG-06, UG-08 paráfrase, UG-10, UG-16, UG-19, UG-28, UG-29 | UG-06 status page, PWA, Playwright install, NF eng, coverage tooling |

---

## Por que isto importa para créditos restantes

Cada crédito em refactor cosmético ou Playwright prematuro compete com: (1) esconder upsell em crise, (2) alinhar docs perigosos, (3) prep B00/004/financeiro, (4) kill switch de custo. Esta auditoria recomenda a segunda lista.
