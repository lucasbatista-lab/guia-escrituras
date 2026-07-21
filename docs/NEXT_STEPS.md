# Next steps

## Concluído (2026-07-20 → 2026-07-21)

- Plan Differentiation & Ethical Upsell V1 (`5ab9cf2`)
- Journey Progress Persistence Foundation (`13258e5`) + migration `20260712000008` **aplicada** em produção
- Reading Journeys MVP V1 (`7113493`) + auto-deploy confirmado
- Intensive sprint 1: AppError journeys, real-usage Vitest, crisis safety, Admin Mobile Ops V1, a11y, Help Center V1
- Intensive sprint 2 (`docs/_ai/AMEM_SECOND_INTENSIVE_SPRINT_2026-07-21.md`): chat reliability, history retention, Playwright defer+Vitest matrix, persona auth, perf cache, acquisition admin, premium continuity/deepen, copy, admin attention, HC V1.1, log redaction
- Intensive sprint 3 (`docs/_ai/AMEM_THIRD_INTENSIVE_SPRINT_2026-07-21.md`): inventário promessas, retenção draft/age, Aprofundar UX, Jornadas V1.1, onboarding/conversão copy, admin V1.2, HC V2, safeNextPath, loadings, real-usage 61, prep bloqueios humanos
- Intensive sprint 4 (`docs/_ai/AMEM_FOURTH_INTENSIVE_SPRINT_2026-07-21.md`): regression review, auth deep-links, entitlements hygiene, FAQ honesty, chat abort/stale, Jornadas complete negatives, history V3, activation, admin triage, privacy drafts, HC anchors, human minimal pack

## Pendente imediato (ops humano)

1. **Smoke autenticado** das Jornadas — `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md`
2. **Revisão pastoral humana** das 21 etapas (`docs/READING_JOURNEYS.md`)
3. (Opcional) Postcheck consolidado 008
4. **B00** verificação remota read-only (policies 004, tabelas 005–007)
5. **Smoke financeiro** — só após prep (`docs/_ai/AMEM_FINANCIAL_SMOKE_PREPARATION_2026-07-20.md`)

## Sequência sugerida depois

6. Migration **004** (decisão humana explícita) + testes RLS locais  
7. Playwright E2E quando harness de mocks process-scoped existir (ver spike 2026-07-21)  
8. Plan Change & Proration — **somente após** smoke financeiro  

## Cutover / ops contínuos

- `docs/PRODUCTION_CUTOVER_RUNBOOK.md` / `docs/LAUNCH_CHECKLIST.md`
- Cron + `CRON_SECRET` — `docs/DAILY_REPORTS.md`
- Migration 004 só após revisão explícita (`docs/DEPLOYMENT.md`)
- Prep humano: `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md` + `AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md`

## Pós-lançamento

- Observabilidade agregada de Jornadas
- Novas jornadas editoriais (eval + revisão humana)
- Streaming no `/api/chat`
- Exclusão de conta (após portabilidade)
- Fonte bíblica licenciada; receita Stripe no relatório diário

## Estado mestre

`docs/END_OF_DAY_MASTER_REPORT_2026-07-20.md` · sprint 2–4 em `docs/_ai/AMEM_*_INTENSIVE_SPRINT_2026-07-21.md`
