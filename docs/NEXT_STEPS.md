# Next steps

## Concluído (2026-07-20 → 2026-07-21)

- Plan Differentiation & Ethical Upsell V1 (`5ab9cf2`)
- Journey Progress Persistence Foundation (`13258e5`) + migration `20260712000008` **aplicada** em produção
- Reading Journeys MVP V1 (`7113493`) + auto-deploy confirmado
- Intensive sprint 1: AppError journeys, real-usage Vitest, crisis safety, Admin Mobile Ops V1, a11y, Help Center V1
- Intensive sprint 2 (`docs/_ai/AMEM_SECOND_INTENSIVE_SPRINT_2026-07-21.md`): chat reliability, history retention, Playwright defer+Vitest matrix, persona auth, perf cache, acquisition admin, premium continuity/deepen, copy, admin attention, HC V1.1, log redaction
- Intensive sprint 3 (`docs/_ai/AMEM_THIRD_INTENSIVE_SPRINT_2026-07-21.md`): inventário promessas, retenção draft/age, Aprofundar UX, Jornadas V1.1, onboarding/conversão copy, admin V1.2, HC V2, safeNextPath, loadings, real-usage 61, prep bloqueios humanos
- Intensive sprint 4 (`docs/_ai/AMEM_FOURTH_INTENSIVE_SPRINT_2026-07-21.md`): regression review, auth deep-links, entitlements hygiene, FAQ honesty, chat abort/stale, Jornadas complete negatives, history V3, activation, admin triage, privacy drafts, HC anchors, human minimal pack
- Intensive sprint 5 (`docs/_ai/AMEM_FIFTH_INTENSIVE_SPRINT_2026-07-21.md`): retenção chat×jornada, chat longo, histórico V4, jornadas fim, Aprofundar affordance, planos/cancelamento, ativação sessão, admin resumo diário, help empty search, privacy/security V3, perf cache journeys, códigos estáveis, matriz de prontidão
- Follow-up Jornadas (`c03ff10`): celebração / CTA catálogo só com conclusão agregada real (`isCompleted` / `completedAt`)

## Primeira sequência de amanhã

1. Confirmar `/api/health` com o tip escolhido para lançamento.
2. Executar postcheck consolidado read-only.
3. Confirmar migrations 005–007 e estado da 004.
4. Decidir explicitamente sobre MIG 004.
5. Executar smoke residual mínimo de Jornadas.
6. Executar revisão pastoral das 21 etapas.
7. Executar smoke financeiro em ambiente de teste.
8. Só depois decidir cutover e próximos blocos financeiros.

Detalhe operacional: `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md`.
Smoke residual **não** repete os 107 testes `pnpm test:real-usage`.
Qualquer falha com condição de interrupção no pacote humano → **parar**; nenhuma destas ações aplica migration automaticamente nem usa produção para teste destrutivo.

## Pendente imediato (ops humano)

1. **B00** verificação remota read-only (health SHA, postcheck 008, policies 004, tabelas 005–007)
2. **Decisão explícita** sobre MIG 004 (só após B00) — pacote `docs/_ai/AMEM_MIG004_DECISION_AND_VALIDATION_PACK_2026-07-22.md`
3. **Smoke autenticado residual** das Jornadas — `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md`
4. **Revisão pastoral humana** das 21 etapas (`docs/READING_JOURNEYS.md`)
5. **Smoke financeiro** — só após prep (`docs/_ai/AMEM_FINANCIAL_SMOKE_PREPARATION_2026-07-20.md`)

## Sequência sugerida depois

6. Migration **004** (apply humano só se decisão = sim) + testes RLS locais
7. Playwright E2E quando harness de mocks process-scoped existir (ver spike 2026-07-21)
8. Plan Change & Proration — **somente após** smoke financeiro

## Cutover / ops contínuos

- `docs/PRODUCTION_CUTOVER_RUNBOOK.md` / `docs/LAUNCH_CHECKLIST.md`
- Cron + `CRON_SECRET` — `docs/DAILY_REPORTS.md`
- Migration 004 só após revisão explícita (`docs/DEPLOYMENT.md`)
- Prep humano: `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md` + `AMEM_HUMAN_BLOCKERS_PREP_2026-07-21.md`
- Matriz de prontidão: `docs/_ai/AMEM_FINAL_LAUNCH_READINESS_MATRIX_2026-07-21.md`

## Pós-lançamento

- Observabilidade agregada de Jornadas
- Novas jornadas editoriais (eval + revisão humana)
- Streaming no `/api/chat`
- Exclusão de conta (após portabilidade)
- Fonte bíblica licenciada; receita Stripe no relatório diário
- Residuais locais opcionais: renomear “Aprofundar”; drafts não user-scoped sem logout; Essencial `?bloqueado=1`; chips de tema no chat vazio

## Estado mestre

Tip de produto validado: `c03ff10` · Sprint 5 + matriz: `docs/_ai/AMEM_FIFTH_INTENSIVE_SPRINT_2026-07-21.md` · `AMEM_FINAL_LAUNCH_READINESS_MATRIX_2026-07-21.md`
