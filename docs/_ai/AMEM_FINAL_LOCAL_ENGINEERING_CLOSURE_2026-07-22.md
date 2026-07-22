# Fechamento local de engenharia — Amém Chat

**Data:** 2026-07-22  
**HEAD de entrada:** `880bc2e`  
**Pacote anterior:** `bf6123d` → `880bc2e`  
**Conclusão:** **A — Não restam bloqueadores locais de engenharia conhecidos; seguir para operação humana/remota.**

---

## 1. Existem bloqueadores locais de engenharia?

**Não.** Os riscos locais ainda relevantes desta rodada foram resolvidos, mitigados com evidência, ou classificados como dependentes de humano/remoto/jurídico/pastoral — nenhum exige mais código local crítico antes do caminho de cutover.

## 2. Findings locais encerrados nesta rodada

| Finding | Tratamento | Commit |
|---------|------------|--------|
| MAE-P2-01 drafts cross-account | Resolvido — keys `v2:{userId}:{conv}` | `600de89` |
| MAE-P1-10 DEMO_MODE/mocks | Resolvido — preview fail-closed com remoto/secrets | `5eb8f03` |
| MAE-P2-11 admin mobile focus | Resolvido — trap Tab, Escape, restore, rota | `c942b5f` |
| MAE-P1-09 free-text scripture | Mitigado — spike + eval; pastoral spot-check | `88b951f` |
| MAE-P1-04 / UG-12 exclusão | Mitigado — runbook manual + registro jurídico | `c4373e4` |
| Runtime smoke gap | Resolvido — `pnpm smoke:local-runtime` | `cb480ad` |
| Kill switch RSC journeys bypass | Resolvido — `ensureJourneyStarted` + pages | `12fcca7` |

## 3. Riscos aceitos (locais)

| Item | Estado |
|------|--------|
| Free-text cites no runtime blocker | Aceito até pós-métricas + pastoral |
| Self-service delete ausente | Aceito — processo manual |
| Admin MFA ausente | Aceito curto prazo (UG-04) |
| sharp advisory via Next | Aceito — aguardar Next (supply-chain review) |
| Smoke auth 503 kill-switch | Aceito — coberto por Vitest; smoke local sem bypass auth |
| CRLF noise `repositories/index.ts` | Aceito — nunca stage |

## 4. Riscos que exigem humano

SHA produção · B00/postchecks · backup · pastoral 21 etapas · e-mail deliverability · smoke Jornadas autenticado · cutover · revisão jurídica retenção/exclusão · spot-check pastoral free-text cites

## 5. Riscos que exigem remoto

B00 · confirmação 005–007 · RLS live · deploy/Vercel env · MFA remoto · recursos externos

## 6. Dependem de migration

MIG 004 decisão/aplicação (pack já existe; **não** aplicada nesta rodada)

## 7. Dependem de financeiro

Smoke Stripe · cobrança live · chargeback playbook em uso humano · **não** proration

## 8. Dependem de pastoral

Revisão 21 etapas · spot-check cites free-text · tagline/identidade (MAE-P1-12) se reabrir

## 9. Dependem de jurídico

Retenção por área (`AMEM_DATA_RETENTION_DECISION_REGISTER`) · NF · menores · prazos LGPD

## 10. Não gastar créditos locais antes do lançamento

Renomear Aprofundar · Essencial `?bloqueado=1` · chips de tema · streaming · search server-side · deepen persistido · virtualização · PWA · i18n · voz · afiliados · Playwright install · refactors cosméticos · coverage tooling · lockfile churn · normalizar `repositories/index.ts`

---

## Commits desta rodada

1. `600de89` — drafts user-scoped  
2. `5eb8f03` — DEMO_MODE/mocks fail-closed  
3. `c942b5f` — admin mobile a11y focus  
4. `88b951f` — scripture free-text spike/evals  
5. `c4373e4` — exclusão/retenção docs  
6. `cb480ad` — local runtime smoke  
7. `12fcca7` — kill switch journeys RSC bypass  
8. (este relatório + NEXT_STEPS)

---

## Matriz residual (Bloco 8)

| Finding | Veredito |
|---------|----------|
| Drafts user-scope | **Resolvido** |
| DEMO_MODE | **Resolvido** |
| Admin focus | **Resolvido** (smoke humano residual: VoiceOver/TalkBack no Mais) |
| Texto livre bíblico | **Mitigado** + pastoral |
| Exclusão manual | **Mitigado** (docs) · self-service **pós** |
| Kill switches | **Resolvido** (bypass RSC fechado) |
| Stable codes | **Resolvido** (pacote anterior) |
| Robots | **Resolvido** (pacote anterior) |
| Crise × upsell | **Resolvido** (pacote anterior) |
| Supply chain | **Aceito** / wait-Next |
| Health honesty | **Resolvido** + smoke |

| Item P3 / roadmap | Antes do lançamento? |
|-------------------|----------------------|
| MAE-P3-01 renomear Aprofundar | **Decisão de produto** / pós |
| MAE-P3-02 Essencial `?bloqueado=1` | **Pós** / decisão produto |
| MAE-P3-03 chips de tema | **Pós** / descartar pré-launch |
| Streaming | **Após dados reais** |
| Search server-side | **Após dados reais** |
| Deepen persistido | **Decisão de produto** / pós |
| Virtualização chat | **Descartar** pré |
| PWA / i18n / voz / afiliados | **Descartar** pré |

---

## Gates (rodada)

| Gate | Antes | Depois |
|------|-------|--------|
| `pnpm test:real-usage` | 108 PASS | **119 PASS** |
| `pnpm test` | 917 PASS | **943 PASS** |
| `pnpm eval:theology:journeys` | PASS | **PASS** |
| `pnpm eval:theology:ci` | PASS | **PASS** |
| `pnpm launch:check` | PASS | **PASS** |
| `pnpm lint` | 0 erros / 5 warnings | **0 erros / 5 warnings** |
| `pnpm build` | PASS | **PASS** |
| `pnpm smoke:local-runtime` | (novo) | **PASS** |

Limitações do smoke: sem sessão autenticada; 503 autenticado dos kill switches permanece em Vitest; www→apex pode não reescrever Host no `127.0.0.1` local.

---

## Recomendação final

**Parar de gastar créditos Cursor em polish local não crítico.**  
Executar imediatamente o **caminho crítico humano/remoto** em `docs/NEXT_STEPS.md`.
