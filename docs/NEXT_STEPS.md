# Next steps

## Cutover (agora)

1. Seguir `docs/PRODUCTION_CUTOVER_RUNBOOK.md` (envs Vercel → deploy → smoke humano).  
2. Completar itens abertos de `docs/LAUNCH_CHECKLIST.md` (produção + verificação humana).  
3. Confirmar `CRON_SECRET` + cron Vercel em production (`docs/DAILY_REPORTS.md`).

## Decisão independente (não bloqueia o cutover de código)

4. Aplicar migration 004 somente após revisão explícita (`docs/DEPLOYMENT.md`) — **não faz parte do cutover inicial**.

## Reading Journeys — ativo (V1)

5. Migration `20260712000008_journey_progress.sql` aplicada em produção (revisão humana).  
6. Postcheck read-only confirmado (`docs/READING_JOURNEYS_PERSISTENCE.md`).  
7. Feature publicada: registry, UI (`/jornadas`), APIs, entitlement `reading_journeys`, export `journeyProgress`, copy comercial.  
8. Ver `docs/READING_JOURNEYS.md` para limitações e processo editorial.

## Pós-lançamento (não bloqueante)

10. Fonte bíblica licenciada.  
11. Streaming no `/api/chat`.  
12. Persistência estruturada de falhas de chat (409/429/503) se a operação precisar disso no admin (exigiria migration).  
13. Receita real Stripe no relatório diário (ledger de pagamentos).  
14. Observabilidade avançada de percentis / alertas externos (e-mail).  
15. Exclusão de conta (após portabilidade V1 em `docs/USER_DATA_PORTABILITY.md`).
