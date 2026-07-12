# Next steps

1. **Conectar Supabase real** — criar projeto, preencher `.env.local`, revisar e aplicar migrations, testar Auth + RLS.  
2. **Persistir chat** — gravar `conversations` / `messages` / `usage_events` / `usage_monthly` no Postgres (sair do store in-memory).  
3. **Fonte bíblica licenciada** — implementar `BiblicalSourceProvider` real; manter mock apenas em demos.  
4. **Streaming** — Responses API streaming no `/api/chat` após a persistência estável.  
5. **Stripe** — Checkout + webhooks; plano Particular permanece “Solicitar acesso”.  
6. **Indicações** — webhooks de 1ª/2ª cobrança → `reward_pending`; painel de aprovação; pagamento manual/automático.  
7. **Relatório diário** — cron chama `compute_daily_report_aggregates` e opcionalmente interpreta com IA só os agregados.  
8. **Onboarding enforcement** — middleware/layout redireciona para `/onboarding` se `onboarding_completed = false`.  
9. **Observabilidade** — correlacionar `request_id` em logs e usage; alertas 70/90/100%.  

## Streaming (nota de design)

Adiado nesta fundação para evitar fragilidade (parcial persistido, erros mid-stream, usage incompleto). Quando implementar: stream de texto + evento final com metadata (referências, usage, `requestId`).
