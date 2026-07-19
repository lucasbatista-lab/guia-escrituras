# Next steps

1. Confirmar `CRON_SECRET` + cron Vercel em production (`docs/DAILY_REPORTS.md`).  
2. Aplicar migration 004 em ambientes onde ainda faltare (`docs/DEPLOYMENT.md`) — **não faz parte deste bloco**.  
3. Fonte bíblica licenciada.  
4. Streaming no `/api/chat`.  
5. Persistência estruturada de falhas de chat (409/429/503) se a operação precisar disso no admin (exigiria migration).  
6. Receita real Stripe no relatório diário (ledger de pagamentos).  
7. Observabilidade avançada de percentis / alertas externos (e-mail) — fora do escopo atual.
