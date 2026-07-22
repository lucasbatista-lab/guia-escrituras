# Amém Chat — Security, Privacy and AI Threat Model

**Data:** 2026-07-21
**Tip auditado na entrada:** `358142e`
**Tip de produto validado:** `c03ff10`
**Aviso:** não é parecer jurídico nem pastoral definitivo.

---

## 1. Ativos

| Ativo | Criticidade |
|-------|-------------|
| Contas / sessões | Alta |
| Mensagens e conteúdo espiritual pessoal | Alta (sensível) |
| Assinaturas / entitlement | Alta (financeira) |
| Service role / Stripe secrets / OpenAI key / CRON_SECRET | Crítica |
| Admin ops (PII, custos) | Alta |
| Catálogo de Jornadas / corpus bíblico | Média (IP + reputação) |
| Reputação teológica da marca | Alta |

---

## 2. Atores

- Visitante anônimo
- Usuário autenticado (Essencial / Caminho / Profundo / Particular)
- Atacante com JWT legítimo (abuso de RLS fraco)
- Atacante sem conta (scraping, spam cadastro)
- Admin comprometido / insider
- Automação / bot
- Provedores (Stripe, Supabase, OpenAI, Vercel)

---

## 3. Superfícies e entradas

Páginas públicas, auth forms, `/api/chat`, journeys APIs, checkout actions, webhook Stripe, cron, admin APIs, export, acquisition cookies, deep-links `next`, markdown/texto no chat (renderizado como texto React).

---

## 4. Cenários de abuso (amostra priorizada)

| ID | Cenário | Controles atuais | Lacuna |
|----|---------|------------------|--------|
| T-01 | Forge usage / assistant messages via JWT | App service path; policies 001 | **MIG 004 não aplicada** (`DATABASE.md:42`) |
| T-02 | Duplicate OpenAI spend cross-instance | Process lock + unique indexes (004) | Lock cross-instance ausente; uniques dependem de 004 |
| T-03 | Open redirect pós-login | `safeNextPath` | Cobertura de teste local OK |
| T-04 | Admin bypass | layout + `requireAdminUser` | Sem MFA; DEMO_MODE admin em mocks |
| T-05 | Webhook replay / mode mix | signature + claim lease + key-mode | Smoke live pendente |
| T-06 | Prompt injection / “seja Jesus” | rules + `assertSafeAiIdentity` + evals | Regex estreita; mock sem identity gate |
| T-07 | Conteúdo espiritual em logs | `mask.ts` redaction | Revisão contínua de novos campos |
| T-08 | Enumeração conversas alheias | `getByIdForUser` | Confiar também em RLS live |
| T-09 | Quota bypass race | budgets + rate limit | Multi-instance races |
| T-10 | Draft leak browser compartilhado | clear on logout | Keys sem userId se logout pulado |
| T-11 | Upsell sob crise | crisis intercept sem error upsell | DeepUpsellHint ainda no composer |
| T-12 | Supply-chain | lockfile | `pnpm audit`: sharp high, postcss moderate |

---

## 5. Autenticação e autorização

**Confirmado localmente:**

- Private path gating + admin role checks.
- Repository methods user-scoped (`getByIdForUser`, list by `user_id`).
- Server actions de auth com Zod.
- Stripe Particular bloqueado no checkout.

**Residuais:**

- RLS hardening 004 remoto.
- MFA admin ausente.
- User enumeration / brute force dependem de Supabase Auth (não auditado live).
- Session fixation / cookie Domain: código usa `.amemchat.com.br` em produção Vercel; docs ainda falam host-only — **corrigir docs** (não o código sem decisão).

---

## 6. Entradas / saídas

| Controle | Estado |
|----------|--------|
| XSS HTML | Baixo — React text; sem `dangerouslySetInnerHTML` no chat |
| Markdown HTML | Não usado no render de mensagens |
| Payload Zod | Chat schema + assertMessageSafe |
| CSV export | Risco formula injection — validar escaping em export admin |
| CSP | Presente; `script-src` com `unsafe-inline` (dívida) |
| Headers | HSTS, frame deny, referrer, permissions — `next.config.ts` |

---

## 7. Privacidade / LGPD (inventário operacional)

| Dado | Base doc | Export | Exclusão | Risco |
|------|----------|--------|----------|-------|
| Conta/e-mail | Privacidade + termos | Parcial via export | Self-service **ausente** (suporte) | Alto operacional |
| Mensagens | Sensível religioso | Export | Manual futuro | Alto |
| Drafts | sessionStorage | N/A | Logout | Médio browser compartilhado |
| Journey progress | IDs only | Via export mappers | Com conta | Médio |
| UTM | 1P cookies | Admin | Expiração cookie | Baixo |
| Consents | versionados | — | — | Bom |
| Logs requestId | ops | — | retenção não RTO/RPO | Médio |
| Stripe | subprocessador | portal | Stripe+local | Alto compliance |

**Exige jurídico/DPO (não engenharia sozinha):** exclusão/retenção formal, subprocessadores internacionais, menores, base legal de dados religiosos, texto de incidentes.

---

## 8. IA e segurança teológica

### Cadeia de proteção

1. Auth + entitlement
2. Input safety
3. Crisis detect → resposta fixa (sem modelo)
4. System prompt / personas / general-rules
5. Grounding corpus
6. Parse estruturado + identity reject
7. Filter refs
8. Presentation normalize (remove requestId/labels internas)
9. Redaction em memory/logs

### Matriz risco × proteção × teste × lacuna

| Risco | Prompt | Runtime | Eval | Lacuna |
|-------|--------|---------|------|--------|
| Identidade divina | Sim | `assertSafeAiIdentity` | identity detectors | Regex estreita; mock skip |
| Revelação/profecia | Sim | parcial | sim | — |
| Crise | Sim | **intercept** | sim | Upsell deepen no composer |
| Alucinação versículo em texto | “não invente” | refs filtradas | refs detector | **texto livre sem scan** |
| Cura/prosperidade/ódio | Sim | não | eval soft | Runtime gap |
| Substituição pastoral | Sim | não | quality soft | Revisão humana |
| Aprofundar = autoridade | Disclaimer copy | profundidade length | fraco | Badge social |
| Particular/WhatsApp pastoral | Copy honesty | checkout block | commercial honesty | Treino suporte humano |

**Falso verde:** theology eval offline não chama `/api/chat`; não prova qualidade OpenAI live (`THEOLOGY_EVALUATIONS.md`).

---

## 9. Incidentes — taxonomia

| Severidade | Exemplos | Bloqueia lançamento? |
|------------|----------|----------------------|
| Sev0 | Vazamento service role; cobrança indevida sistêmica; RLS forge em massa | Sim |
| Sev1 | Entitlement errado pago; crisis mishandle; conteúdo espiritual no admin | Sim até mitigar |
| Sev2 | Webhook delay; relatório diário falho; custo AI spike | Operar com runbook |
| Sev3 | Copy inconsistente; SEO robots gap mitigado por noindex | Não |

Responsáveis típicos: Eng (app), Ops (remoto/env), Fin (Stripe), Pastoral (conteúdo), Jurídico (LGPD).

---

## 10. Mitigações recomendadas (planejamento — não executar aqui)

1. B00 + decisão MIG 004 (remoto).
2. Smoke financeiro test mode.
3. Corrigir docs cookie Domain.
4. Ocultar/desativar deepen upsell durante/após crise na UI.
5. Completar catálogo stable error codes.
6. Plano de exclusão de conta (produto+jurídico).
7. Avaliar sharp/postcss advisories no Next.
8. MFA admin + audit trail (pós ou pré conforme risco aceito).
9. Revisão pastoral 21 etapas.
10. Não tratar evals verdes como prova live.

---

## 11. Revisão humana obrigatória

- Pastoral: Jornadas + tom de marca/tagline.
- Jurídico: privacidade, exclusão, subprocessadores.
- Ops: B00, secrets, cutover SHA.
- Fin: smoke Stripe + chargeback playbook futuro.
