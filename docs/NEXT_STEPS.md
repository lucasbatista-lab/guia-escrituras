# Next steps

## Concluído (2026-07-20)

- Plan Differentiation & Ethical Upsell V1 (`5ab9cf2`)
- Journey Progress Persistence Foundation (`13258e5`) + migration `20260712000008` **aplicada** em produção
- Reading Journeys MVP V1 (`7113493`) + auto-deploy confirmado
- Postcheck consolidado preferencial + runbook de retomada (docs desta noite)

## Pendente imediato (amanhã)

1. **Smoke autenticado** das Jornadas — seguir `docs/TOMORROW_LAUNCH_RUNBOOK.md`
2. **Revisão pastoral humana** das 21 etapas (`docs/READING_JOURNEYS.md`)
3. (Opcional) Rodar postcheck consolidado:  
   `supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql`

## Próximo bloco após smoke verde

4. **Admin Mobile Operations V1**

## Sequência sugerida depois

5. Help Center & Support Intake V1  
6. Acquisition Content Attribution V1  
7. Autonomous Operations Runbook V1  
8. Smoke de pagamento → só então Plan Change & Proration  

## Cutover / ops contínuos

- `docs/PRODUCTION_CUTOVER_RUNBOOK.md` / `docs/LAUNCH_CHECKLIST.md` conforme itens abertos  
- Cron + `CRON_SECRET` — `docs/DAILY_REPORTS.md`  
- Migration 004 só após revisão explícita (`docs/DEPLOYMENT.md`)

## Pós-lançamento (não bloquear smoke de Jornadas)

- Observabilidade agregada de Jornadas (funil a partir dos eventos já logados)
- Novas jornadas editoriais (com eval + revisão humana)
- Streaming no `/api/chat`
- Exclusão de conta (após portabilidade — `docs/USER_DATA_PORTABILITY.md`)
- Troca de plano / proration **após** smoke financeiro
- Fonte bíblica licenciada; receita Stripe no relatório diário; alertas externos

## Estado mestre

`docs/END_OF_DAY_MASTER_REPORT_2026-07-20.md`
