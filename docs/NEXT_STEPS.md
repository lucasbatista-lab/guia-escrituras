# Next steps

## Cutover (agora)

1. Seguir `docs/PRODUCTION_CUTOVER_RUNBOOK.md` (envs Vercel → deploy → smoke humano).  
2. Completar itens abertos de `docs/LAUNCH_CHECKLIST.md` (produção + verificação humana).  
3. Confirmar `CRON_SECRET` + cron Vercel em production (`docs/DAILY_REPORTS.md`).

## Decisão independente (não bloqueia o cutover de código)

4. Aplicar migration 004 somente após revisão explícita (`docs/DEPLOYMENT.md`) — **não faz parte do cutover inicial**.

## Pós-lançamento (não bloqueante)

5. Fonte bíblica licenciada.  
6. Streaming no `/api/chat`.  
7. Persistência estruturada de falhas de chat (409/429/503) se a operação precisar disso no admin (exigiria migration).  
8. Receita real Stripe no relatório diário (ledger de pagamentos).  
9. Observabilidade avançada de percentis / alertas externos (e-mail).  
10. Exclusão de conta (após portabilidade V1 em `docs/USER_DATA_PORTABILITY.md`).
