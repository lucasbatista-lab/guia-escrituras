# Next steps

## Caminho crítico de lançamento

1. Confirmar SHA em produção (`/api/health` vs tip de lançamento escolhido).
2. B00 / postchecks / confirmação remota 005–007 (read-only).
3. Backup (pré-condição antes de qualquer migration).
4. Decisão / aplicação MIG 004 — só com `docs/_ai/AMEM_MIG004_DECISION_AND_VALIDATION_PACK_2026-07-22.md` e backup.
5. Smoke autenticado residual das Jornadas (pacote humano mínimo).
6. Revisão pastoral das 21 etapas.
7. E-mail deliverability (SPF/DKIM/bounce — Auth).
8. Smoke financeiro (test mode + chargeback playbook lido).
9. Revisão jurídica mínima (retenção/exclusão — `AMEM_DATA_RETENTION_DECISION_REGISTER_2026-07-22.md`).
10. Cutover humano (`PRODUCTION_CUTOVER_RUNBOOK` / `LAUNCH_CHECKLIST`).

Detalhe operacional: `docs/_ai/AMEM_HUMAN_MINIMAL_ACTIONS_2026-07-21.md`.  
Fechamento local de engenharia: `docs/_ai/AMEM_FINAL_LOCAL_ENGINEERING_CLOSURE_2026-07-22.md`.  
**Não** colocar features novas antes desta sequência.

---

## Concluído (2026-07-20 → 2026-07-22)

- Plan Differentiation & Ethical Upsell V1 (`5ab9cf2`)
- Journey Progress Persistence Foundation (`13258e5`) + migration `20260712000008` **aplicada** em produção
- Reading Journeys MVP V1 (`7113493`) + auto-deploy confirmado
- Intensive sprints 1–5 + follow-up Jornadas (`c03ff10`)
- Auditoria-mestre (`bf6123d`) + hardening local (`880bc2e`) — crise×upsell, docs, stable codes, robots, finance prep, MIG 004 pack, kill switches, ops runbooks, supply-chain
- **Fechamento local final** (pós-`880bc2e`): drafts user-scoped, DEMO_MODE fail-closed, admin a11y focus, scripture free-text spike, exclusão/retenção runbooks, smoke `next start`, kill-switch RSC journeys — ver `AMEM_FINAL_LOCAL_ENGINEERING_CLOSURE_2026-07-22.md`

## Pendente imediato (ops humano)

Itens 1–10 da seção **Caminho crítico de lançamento** acima.

## Sequência sugerida depois do cutover

- Observabilidade agregada de Jornadas
- Playwright E2E quando harness process-scoped existir
- Plan Change & Proration — **somente após** smoke financeiro
- Self-service exclusão — **somente após** decisões jurídicas de retenção
- Telemetria redigida / runtime não bloqueante para cites free-text (spike 2026-07-22)

## Cutover / ops contínuos

- `docs/PRODUCTION_CUTOVER_RUNBOOK.md` / `docs/LAUNCH_CHECKLIST.md`
- Cron + `CRON_SECRET` — `docs/DAILY_REPORTS.md`
- Exclusão manual — `docs/_ai/AMEM_MANUAL_ACCOUNT_DELETION_AND_RETENTION_RUNBOOK_2026-07-22.md`
- Matriz de prontidão: `docs/_ai/AMEM_FINAL_LAUNCH_READINESS_MATRIX_2026-07-21.md`

## Pós-lançamento (não gastar créditos locais agora)

- Streaming `/api/chat`; search server-side; deepen persistido; PWA; i18n; voz; afiliados
- Residuais cosméticos: renomear “Aprofundar”; Essencial `?bloqueado=1`; chips de tema
- Fonte bíblica licenciada; receita Stripe no relatório diário
