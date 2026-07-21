# Amém Chat — Third Intensive Sprint Log

**Data:** 2026-07-21  
**Branch:** `main`  
**HEAD inicial:** `6b7b0f5` (pós-reconciliação; tip anterior `b8f64fd`)  
**HEAD final:** _(atualizado no fechamento)_

## F0 — Reconciliação Git (`3a05e72` × `b8f64fd`)

| Item | Valor |
|------|--------|
| HEAD / `origin/main` na entrada | `b8f64fd` |
| Working tree | limpo exceto CRLF `src/lib/database/repositories/index.ts` |
| `3a05e72` | Fechamento **substantivo** da sprint 2: docs + split client/server de histórico (`display.ts`), ajustes de testes/health |
| `b8f64fd` | **Somente docs**: substituiu placeholder “HEAD final: (atualizado no commit F12)” por `` `3a05e72` `` |
| Por que o log dizia `3a05e72` e o retorno `b8f64fd` | O log registrou o SHA do fechamento de produto; o tip do repo avançou 15s depois com o carimbo documental. Ambos corretos em papéis diferentes. |
| Correção | Doc sprint 2: **HEAD final** = `b8f64fd` (docs-only; substantivo `3a05e72`) — commit `6b7b0f5` |

**Não** alterado: código produtivo, migrations, Stripe, billing, preços, quotas.

---

## F1 — Inventário de promessas e gaps

Varredura: `em desenvolvimento` / `em breve` / `coming soon` / `TODO` / `FIXME` / entitlements reservados / pricing / paywalls / onboarding / conta / admin / docs.

| Recurso | Plano | Onde aparece | Estado real | Dep. | MIG? | Stripe? | OpenAI? | Risco | Conv. | Ret. | Classificação | Recomendação |
|---------|-------|--------------|-------------|------|------|---------|---------|-------|-------|------|---------------|--------------|
| Chat standard | todos pagos | home, planos, chat | **Ativo** | — | não | não | mock ok | Baixo | Alto | Alto | concluído | Manter |
| Histórico + resume | todos | `/conversas`, `/inicio` | **Ativo** (+ V1.1) | — | não | não | não | Baixo | Médio | Alto | concluído | Manter; F2 draft local |
| Aprofundar | Profundo+ | chat, `/planos#aprofundar` | **Ativo** (entitlement) | budget | não | não | sim (path) | Médio custo | Alto | Médio | melhorar apresentação | F3 UX valor sem quota |
| Jornadas 3×7 | Caminho+ | `/jornadas`, início | **Ativo** | 008 | não* | não | não | Médio editorial | Alto | Alto | melhorar UX | F4 V1.1 polish |
| Uso frequente / fair use | Caminho+ | copy planos | **Parcial** (budgets por plano; keys `chat_frequent`/`fair_use_extended` **reservadas**) | config | não | não | não | Baixo | Médio | Médio | melhor apresentar | Copy já honest; não fingir entitlement |
| Memória ampliada | Profundo | Em desenvolvimento | **Reservado** | MIG? | talvez | não | sim | Alto | Médio | Alto | permanecer futuro | Não vender como ativo |
| Múltiplas personas | Profundo | Em desenvolvimento / reserved | **Reservado** | teol. | não | não | sim | **Alto teol.** | Médio | Médio | permanecer futuro | Não implementar nesta sprint |
| Áudio | Profundo | Em desenvolvimento | **Reservado** | custo | talvez | não | sim | Alto | Médio | Médio | permanecer futuro | Manter só roadmap |
| Troca automática de planos | todos | planos, conta, FAQ, upsell | **Não implementado** | B16/B17 | ? | **SIM** | não | Alto $ | Alto | — | depende billing | Comunicação honesta já; não fingir |
| Alteração de e-mail na conta | todos | `/conta` | **Não disponível** | Auth | não | não | não | Baixo | Baixo | Baixo | pode melhorar apresentação | Manter disclaimer; ops futuro |
| Priority support | Profundo | reserved + mailto | **Parcial** (HC mailto) | ops | não | não | não | Baixo | Médio | Médio | melhor apresentar | F8 HC |
| Concierge / WhatsApp Particular | Particular | upcoming | Flag / manual | HUMAN | não | não | não | WhatsApp pastoral **proibido** | — | — | permanecer futuro / não espiritual | Nunca chat pastoral WA |
| Crisis safety | todos | chat path | **Ativo V1** | calibragem | não | não | não | Alto se falhar | — | Confiança | concluído | Revisão pastoral humana |
| Help Center | todos | `/ajuda` | **Ativo V1.1** | — | não | não | não | Baixo | Médio | Médio | melhorar | F8 busca/categorias |
| Admin Mobile Ops | ops | `/admin` | **Ativo V1.1** | — | não | não | não | Baixo | — | — | melhorar | F7 filtros atenção |
| Aquisição medium/content | ops | admin aquisição | **Ativo V1** | — | não | não | não | Baixo | — | — | melhorar | F7 filtros lista |
| Canal suporte e-mail | todos | ajuda (`SUPPORT_CHANNEL_PENDING` se vazio) | Condicional env | config | não | não | não | Baixo | Médio | — | melhor apresentar | Já honest |
| Playwright E2E | — | spike | **Adiado** | harness | não | não | não | Flaky | — | — | permanecer futuro | Sem install |
| Lock chat cross-instance | — | chat | **Parcial** local | MIG 004 | **SIM** | não | não | Médio | — | Médio | depende migration | Não fingir |
| RLS 004 | — | schema | **Não aplicada** | HUMAN | **SIM** | não | não | P1 | — | — | depende migration | B00/B05 |
| extended_memory no entitlement Profundo | Profundo | `plans.ts` entitlements[] | Listado no catálogo interno; **não** ativo em runtime; cards públicos filtram | — | — | — | — | Confusão interna | — | — | melhor apresentar / dívida | Não misturar em displayBenefits (já OK) |
| Onboarding `/onboarding` | todos | rota | Redirect → `/personalizar` | — | não | não | não | Baixo | Médio | Médio | melhorar ativação | F5 |
| CTA home → planos | anôn. | home | Intencional plan-first | — | não | não | não | Baixo | Alto | — | melhor apresentar | F5/F6 alinhar expectativa |
| Favoritos de mensagens | — | matriz | Ausente | MIG | **SIM** | não | não | Baixo | Médio | Alto | depende migration | Adiar |
| Streaming chat | — | NEXT_STEPS | Ausente | — | não | não | sim | Médio | Médio | Médio | permanecer futuro | Adiar |
| Exclusão de conta | — | NEXT_STEPS | Ausente | legal | talvez | não | não | Médio | Baixo | — | permanecer futuro | Após portabilidade |
| Receita Stripe no daily report | ops | enrich null | Não integrado | Stripe | não | read | não | Baixo | — | — | depende financeiro | Prep only |
| Smoke financeiro / proration | — | prep docs | Bloqueado | HUMAN | ? | **SIM** | não | Alto | — | — | depende billing | F12 prep only |

\*Jornadas: schema 008 já aplicado; sem nova migration nesta sprint.

### Decisões F1 (sem alterar copy ainda)

- **Pode concluir agora:** draft local chat; Jornadas UX completed; Aprofundar badge UI; HC search; admin filtros; onboarding/ativação copy; segurança negativa; perf local; testes.
- **Melhor apresentar agora:** home CTA; diferenciação Caminho/Profundo; HC timing; conta e-mail.
- **Depende migration:** favoritos, lock cross-instance, RLS 004, talvez memória ampliada.
- **Depende billing:** troca de plano, proration, smoke live.
- **Remover da comunicação:** nada inventado encontrado nos cards públicos (roadmap isolado em “Em desenvolvimento” — manter).
- **Permanecer futuro:** personas, áudio, streaming, WA espiritual, Playwright até harness.

---

## Ordem de execução (blocos seguros)

1. F0 ✓ · 2. F1 ✓ · 3. F2 Retenção · 4. F3 Profundo · 5. F4 Jornadas · 6. F5 Onboarding · 7. F6 Conversão · 8. F7 Admin · 9. F8 Suporte · 10. F9 Segurança · 11. F10 Perf · 12. F11 Testes · 13. F12 Prep humano · 14. F13 Docs/gates
