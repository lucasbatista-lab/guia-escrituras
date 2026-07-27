# Amém Chat — Launch GO Handoff

**Documento:** handoff operacional pós-GO
**Data do handoff:** 2026-07-28
**Fechamento runtime:** 2026-07-27
**Sem alteração de produto neste documento.**

---

## Estado executivo

| Item | Valor |
|------|--------|
| Veredito | **GO** |
| SHA (HEAD / origin/main / produção) | `8b8a7d1` |
| Produção | `https://amemchat.com.br` |
| Data do GO | 2026-07-27 |
| Next.js | 16.2.11 |
| `/api/health` | `ok` · version `8b8a7d1` |
| `/api/health/db` | `ok` |
| Preços | R$ 38 / R$ 58 / R$ 188 intactos |
| P0 abertos | **nenhum** |
| Migrations aplicadas no GO | `004`, `009`, `010`, `011`, `012` (+ `001`–`003`, `008` já anteriores) |

**Gates finais satisfeitos:** health ok; db ok; SHA alinhado; Essencial gated; Profundo/Aprofundar/crise/Jornadas/Admin validados; MIG 004 postcheck + smokes verdes; runtime 012 verde.

Fontes: `docs/_ai/AMEM_FINAL_RUNTIME_CLOSURE_2026-07-27.md`, `docs/DATABASE.md`.

---

## Recursos validados

| Área | Estado |
|------|--------|
| Público | C01–C09 PASS; overflow mobile 0; preços e copy honestos |
| Cadastro | Funil `cadastro?plan=` OK (regressão pública) |
| Planos | Essencial / Caminho / Profundo; CTAs autenticados → gerenciar |
| Essencial | Chat 200; sem Aprofundar; Jornadas gated; Admin redirect |
| Profundo | Chat 200; Aprofundar 200; Jornadas; Conta coerente |
| Chat | Persistência + refresh; pós-crise não contaminada |
| Aprofundar | UI + send; placeholder; cancelar/reativar |
| Crise | Interceptada; provider mock; tokens 0; CVV 188 / SAMU 192 |
| Jornadas | 3 jornadas (1 etapa); integral Ansiedade 7/7; reset + reuso |
| Conta | Planos/status/preço coerentes nas contas testadas |
| Admin | Usuário comum bloqueado; operador legítimo read-only |
| Mobile | Viewports públicos sem overflow nos checks C01–C09 |
| Segurança | Headers produção presentes; MIG 004 harden RLS; sem P0 aberto |

---

## Banco

| Migration | Aplicada | Postcheck | Runtime | Observação |
|-----------|----------|-----------|---------|------------|
| 004 | 2026-07-27 | `overall_ok=true` | smoke app verde | smoke transacional 6/6; forge assistant/usage/cross-user bloqueados; escrita legítima OK; ROLLBACK |
| 009 | 2026-07-26 | `overall_ok=true` | — | anon grants harden |
| 010 | 2026-07-26 | função OK; `table_grants_ok` histórico frágil | — | unnest aliases |
| 011 | 2026-07-26 | `overall_ok=true` | — | least privilege tabela |
| 012 | 2026-07-27 | estrutural: `plpgsql_vars_present=false` (**falso negativo**) | smoke + Jornada 7/7 verdes | `\b` em regex PG = backspace; corrigir só o postcheck |

**Não** reaplicar 004 nem 009–012. **Não** criar migration para o falso negativo do postcheck 012.

---

## Contas de teste

| Papel | Testado | Credenciais |
|-------|---------|-------------|
| Conta Essencial | Sim (chat, gating Jornadas, Admin negado) | Nenhuma senha armazenada neste handoff |
| Conta Profundo | Sim (chat, Deep, crise, Jornadas 7/7, reset) | Nenhuma senha armazenada neste handoff |

E-mails de teste não são indispensáveis ao handoff operacional; detalhes mínimos no fechamento runtime (sem senhas/cookies/JWTs).

---

## Pendências pós-lançamento

Somente itens **não bloqueadores**:

1. Decidir comportamento de crise para assinatura inativa / sem `chat_standard`.
2. Acompanhar sharp/postcss transitivos pelo Next.
3. Revisar se a conta Profundo de teste deve permanecer admin.
4. Corrigir futuramente o postcheck 012 (`plpgsql_vars_present` / `\b` → âncoras POSIX).
5. Monitorar erros (5xx / RLS) nas primeiras horas de tráfego real.
6. Pastoral contínuo das 21 etapas; deliverability; jurídico residual.

---

## Checklist diário de operação

1. `/api/health` — status ok; version esperada (tip atual).
2. `/api/health/db` — status ok; latência razoável.
3. Uma mensagem de chat (smoke humano rápido).
4. Erros 5xx (logs / observabilidade).
5. Erros RLS (42501 / anomalias de permissão).
6. Stripe / webhooks (falhas, retries, mode).
7. Assinaturas e entitlements (pagou sem plano / plano sem pagar).
8. Suporte (tickets, requestId, sem colar conteúdo espiritual amplo).
9. Custos (OpenAI / burst); kill switches se necessário.
10. Incidentes de crise (intercept; CVV/SAMU; escalonamento humano).

Detalhe de incidentes: `docs/_ai/AMEM_OPS_INCIDENT_RUNBOOKS_MINIMAL_2026-07-22.md`.

---

## Regra de mudança

Qualquer alteração em:

- Stripe;
- preços;
- entitlements;
- chat;
- crise;
- migrations;
- RLS;
- Aprofundar;
- Jornadas;

exige **smoke direcionado** antes de novo deploy.

Não alterar lockfile, prompts/modelos ou billing sem revisão explícita.
Não normalizar/commitar `src/lib/database/repositories/index.ts` (ruído CRLF local).
