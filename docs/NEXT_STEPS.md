# Next steps

1. **Aplicar migration 004** após revisão humana (`docs/DEPLOYMENT.md`).  
2. Configurar `SUPABASE_SECRET_KEY` na Vercel (necessário pós-004 para assistant/usage).  
3. Criar primeiro admin em `admin_roles` + assinatura de teste.  
4. Ligar Stripe Checkout + webhooks (sem plano gratuito).  
5. Cron do relatório diário com `compute_daily_report_aggregates`.  
6. Fonte bíblica licenciada.  
7. Streaming no `/api/chat`.  
8. Observabilidade com `request_id` e alertas 70/90/100%.
