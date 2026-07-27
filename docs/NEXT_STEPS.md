# Next steps

**Estado de lançamento (2026-07-27/28):** **GO** em produção `8b8a7d1`.
Handoff: `docs/_ai/AMEM_LAUNCH_GO_HANDOFF_2026-07-28.md`.
Fechamento runtime: `docs/_ai/AMEM_FINAL_RUNTIME_CLOSURE_2026-07-27.md`.
Banco: `docs/DATABASE.md`.

## Caminho crítico de lançamento — encerrado

1. ~~Confirmar SHA em produção~~ — **GO:** `/api/health` version = `8b8a7d1` = HEAD = origin/main.
2. B00 / postchecks / confirmação remota 005–007 (read-only) — residual não bloqueador se ainda aberto.
3. Backup (pré-condição antes de qualquer migration futura) — manter disciplina.
4. ~~Aplicar MIG 009~~ — **feita 2026-07-26**; postcheck consolidado `overall_ok = true`. **Não** reaplicar.
5. ~~Aplicar MIG 010~~ — **feita**; aliases unnest OK. **Não** reaplicar.
6. ~~Aplicar MIG 011~~ — **feita**; privilégio mínimo tabela `overall_ok = true`. **Não** reaplicar.
7. ~~Aplicar MIG 012~~ — **feita 2026-07-27**; runtime + Jornada 7/7 OK. `plpgsql_vars_present=false` = falso negativo do postcheck (`\b` = backspace em PG). **Não** reaplicar 008–012; corrigir só o postcheck no futuro.
8. ~~Decisão / aplicação MIG 004~~ — **feita 2026-07-27**; postcheck `overall_ok=true`; smoke transacional 6/6; smoke app pós-004 verde. **Não** reaplicar.
9. ~~Deploy fixes P0 + reteste crise~~ — crise interceptada (mock, tokens 0) no runtime GO.
10. Revisão pastoral das 21 etapas — pós-lançamento / contínuo.
11. E-mail deliverability (SPF/DKIM/bounce — Auth) — monitoramento contínuo.
12. Smoke financeiro contínuo — ver plan Stripe low-cost; não reabrir billing sem smoke.
13. Revisão jurídica mínima (retenção/exclusão) — contínuo.
14. ~~Cutover humano~~ — produção estável no SHA de GO; checklist diário no handoff.

## Pendências pós-lançamento (não bloqueadoras)

1. Decidir comportamento de crise para assinatura inativa / sem `chat_standard`.
2. Acompanhar sharp/postcss transitivos via Next.
3. Revisar se a conta Profundo de teste deve permanecer admin.
4. Corrigir futuramente o postcheck 012 (`plpgsql_vars_present` / `\b`).
5. Monitorar erros (5xx / RLS) nas primeiras horas de tráfego real.
6. Pastoral das 21 etapas; deliverability; jurídico residual.

## Sequência sugerida depois do cutover

- Observabilidade agregada de Jornadas
- Playwright E2E quando harness process-scoped existir
- Plan Change & Proration — **somente após** smoke financeiro
- Self-service exclusão — **somente após** decisões jurídicas de retenção
- Telemetria redigida / runtime não bloqueante para cites free-text (spike 2026-07-22)

## Ops contínuos

- Checklist diário: `docs/_ai/AMEM_LAUNCH_GO_HANDOFF_2026-07-28.md`
- `docs/PRODUCTION_CUTOVER_RUNBOOK.md` / `docs/LAUNCH_CHECKLIST.md`
- Cron + `CRON_SECRET` — `docs/DAILY_REPORTS.md`
- Exclusão manual — `docs/_ai/AMEM_MANUAL_ACCOUNT_DELETION_AND_RETENTION_RUNBOOK_2026-07-22.md`
- Incidents: `docs/_ai/AMEM_OPS_INCIDENT_RUNBOOKS_MINIMAL_2026-07-22.md`

**Regra:** qualquer alteração em Stripe, preços, entitlements, chat, crise, migrations, RLS, Aprofundar ou Jornadas exige smoke direcionado antes de novo deploy.

## Pós-lançamento (não gastar créditos locais agora)

- Streaming `/api/chat`; search server-side; deepen persistido; PWA; i18n; voz; afiliados
- Residuais cosméticos: renomear “Aprofundar”; Essencial `?bloqueado=1`; chips de tema
- Fonte bíblica licenciada; receita Stripe no relatório diário
