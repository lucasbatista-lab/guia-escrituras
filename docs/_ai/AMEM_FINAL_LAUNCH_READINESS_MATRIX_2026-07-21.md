# Amém Chat — Final Launch Readiness Matrix

**Data original:** 2026-07-21
**Atualização GO:** 2026-07-27/28 — produção **`8b8a7d1`**, veredito **GO**.
**Fonte de verdade pós-lançamento:** `docs/_ai/AMEM_LAUNCH_GO_HANDOFF_2026-07-28.md` · `docs/DATABASE.md` · `docs/_ai/AMEM_FINAL_RUNTIME_CLOSURE_2026-07-27.md`.

**Tip histórico desta matriz:** `c03ff10` (ver `AMEM_FIFTH_INTENSIVE_SPRINT_2026-07-21.md`).
**SHA de GO:** `8b8a7d1` (Next.js 16.2.11; MIG 004 + 009–012 aplicadas).

**Regra:** não declarar “pronto” quando depender de humano, remoto ou financeiro — **satisfeita no fechamento runtime**; pendências restantes são pós-lançamento não bloqueadoras.

| Domínio | Estado | Cobertura | Risco | Bloqueio | Ação | Responsável | Evidência necessária |
|---------|--------|-----------|-------|----------|------|-------------|----------------------|
| Site público | **GO** | C01–C09 | Baixo | — | Monitorar | Eng | `/api/health` |
| Autenticação | **GO** | Contas Essencial + Profundo | Médio | Remoto Auth | Smoke login | Eng + Ops | Conta teste |
| Chat | **GO** | Abort + smoke pós-004 | Médio | — | Checklist diário | Eng | Mensagem OK |
| Histórico | **GO** | Persistência + refresh | Baixo | — | — | Eng | `/conversas` |
| Jornadas | **GO** | 3 jornadas + integral 7/7 + reset | Médio editorial | Pastoral contínuo | — | Eng + Pastoral | complete + reset |
| Aprofundar | **GO** | Profundo 200 | Médio custo AI | — | Monitorar custo | Eng | 1 deepen |
| Planos / conversão | **GO** | 38/58/188 intactos | Médio $ | Troca de plano | — | Eng | `/planos` |
| Admin | **GO** | Comum bloqueado; operador OK | Baixo | — | Revisar admin de teste | Ops | `/admin` |
| Banco / RLS | **GO** | MIG 004 + 009–012 | Residual postcheck 012 | — | Patch postcheck 012 | Ops | `DATABASE.md` |
| Remoto / deploy | **GO** | SHA = tip | Drift | — | Health diário | Ops | version `8b8a7d1` |
| Pagamentos | Operacional | Live paths existentes | Alto se mudar | Stripe changes | Smoke direcionado | Ops + Fin | Webhooks |

## O que era bloqueio e foi fechado no GO

1. ~~Confirmação remota B00 (policies 004)~~ — MIG 004 aplicada + smokes.
2. ~~Decisão e apply humano de MIG 004~~ — feita 2026-07-27.
3. ~~Smoke autenticado residual de Jornadas~~ — 7/7 + reset.
4. Revisão pastoral das 21 etapas — **pós-lançamento contínuo**.
5. Smoke financeiro contínuo — não reabrir billing sem smoke.
6. Playwright E2E harness — pós-lançamento.
7. Receita real Stripe no admin — pós-lançamento.
8. Troca de plano / proration — pós-lançamento / decision pack.
