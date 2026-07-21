# Amém Chat — Final Launch Readiness Matrix

**Data:** 2026-07-21  
**Tip documentado ao fechar a sprint 5:** ver `AMEM_FIFTH_INTENSIVE_SPRINT_2026-07-21.md` (HEAD final).  
**Regra:** não declarar “pronto” quando depender de humano, remoto ou financeiro.

| Domínio | Estado | Cobertura | Risco | Bloqueio | Ação | Responsável | Evidência necessária |
|---------|--------|-----------|-------|----------|------|-------------|----------------------|
| Site público | Pronto local | Marketing + SEO pages | Baixo | — | Manter | Eng | `pnpm build` + smoke visual |
| Autenticação | Pronto local | Deep-link resume, safeNextPath | Médio | Remoto Auth | Smoke login humano | Eng + Ops | Conta teste + deep-link |
| Chat | Pronto local | Abort, cancel, stale, truncagem, not_found | Médio | MIG 004 lock | Smoke envio | Eng | Mensagem OK + cancel |
| Histórico | Pronto local | Busca local, hard-cap, clear | Baixo | Search server-side (adiado) | — | Eng | `/conversas` filtro |
| Jornadas | Pronto local | Complete negatives, CTA pós-fim | Médio editorial | Pastoral humano | Smoke residual | Eng + Pastoral | 1 etapa + reset |
| Aprofundar | Pronto local (UX) | Affordance pós-resposta | Médio custo AI | Quota/tokens intocados | Smoke Profundo | Eng | 1 deepen + badge |
| Planos / conversão | Pronto local copy | FAQ cross-surface + cancelamento | Médio $ | Troca de plano | — | Eng | FAQ home/planos/ajuda |
| Admin | Pronto local | Resumo do dia + atenção | Baixo | Receita Stripe null | Revisão diária | Ops | `/admin` mobile |
| Suporte | Pronto local | FAQ search, mailto requestId | Baixo | E-mail env | Config SUPPORT_EMAIL | Ops | Mailto técnico |
| Aquisição | Pronto local | UTM sanitize + admin | Baixo | — | — | Ops | Admin aquisição |
| Privacidade | Pronto local | Drafts + checklist clear logout | Médio | Exclusão conta (futuro) | — | Eng | Logout limpa storage |
| Observabilidade | Pronto local | requestId, redaction, códigos | Baixo | Agregação externa | — | Eng | `/api/health` |
| Pagamentos | **Não pronto** | Prep docs only | Alto | Stripe live, checkout, billing, webhook, proration | Smoke financeiro | Ops + Fin | Prep + contas teste |
| Banco / RLS | **Parcial** | App layer OK | Alto (004) | B00, MIG 004, postcheck | Confirmar remoto | Ops | SQL read-only |
| Remoto / deploy | **Não nesta sprint** | Gates locais | Alto se SHA drift | Deploy humano | Confirmar SHA health | Ops | `/api/health` version |

## O que NÃO está pronto para chamar de lançamento fechado

1. Confirmação remota B00 (005–007 + policies 004).  
2. Decisão e apply humano de MIG 004.  
3. Smoke autenticado residual de Jornadas.  
4. Revisão pastoral das 21 etapas.  
5. Smoke financeiro (Stripe test).  
6. Playwright E2E (harness insuficiente).  
7. Receita real Stripe no admin.  
8. Troca de plano / proration.
