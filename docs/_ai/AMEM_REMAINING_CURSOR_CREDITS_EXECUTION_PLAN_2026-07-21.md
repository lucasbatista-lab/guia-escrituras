# Amém Chat — Remaining Cursor Credits Execution Plan

**Data:** 2026-07-21
**Tip auditado na entrada:** `358142e`
**Tip de produto validado:** `c03ff10`

Objetivo: maximizar valor de lançamento por crédito — não volume de código.

---

## Princípios

1. Humanos/remotos primeiro quando bloqueiam verdade.
2. Engenharia local só quando evidencia + teste + gate claros.
3. Sem migrations automáticas, sem Stripe alterado, sem deploy, sem tocar `repositories/index.ts`, sem `git add .`.
4. Não gastar créditos em Playwright install, refactors cosméticos, docs duplicadas, features roadmap.

---

## Trilhas

### TRILHA A — Bloqueadores locais pré-lançamento
| Bloco | Findings | Intensidade | Valor launch |
|-------|----------|-------------|--------------|
| A1 Crisis×upsell UI | MAE-P1-01 | média | alto reputacional |
| A2 Stable error codes catalog | MAE-P2-04 | pequena | médio ops |
| A3 Robots `/jornadas` | MAE-P2-02 | pequena | baixo-médio SEO |

### TRILHA B — Prep MIG 004 / RLS
| Bloco | Findings | Intensidade | Valor |
|-------|----------|-------------|-------|
| B1 Pacote decisão 004 (doc+checklist SQL read-only) | MAE-P0-01 | média | crítico remoto |
| B2 Testes locais RLS contract já existentes — não expandir sem apply | — | — | evitar desperdício |

### TRILHA C — Prep financeira
| Bloco | Findings | Intensidade |
|-------|----------|-------------|
| C1 Atualizar smoke checklist com 12 testes financeiros da matriz | MAE-P0-02 | pequena |
| C2 Chargeback playbook 1 página | UG-07 | pequena |
| **Não:** implementar proration/troca | — | — |

### TRILHA D — Segurança / privacidade / legal
| Bloco | Findings | Intensidade |
|-------|----------|-------------|
| D1 Fix docs cookie Domain + theology crisis wording | MAE-P1-02, MAE-P1-05 | pequena |
| D2 Kill switch env design (doc+minimal code se aprovado) | UG-05 | média |
| D3 Processo exclusão manual (doc) | MAE-P1-04 | média |
| **Jurídico humano:** menores, NF, retention legal | — | — |

### TRILHA E — Experiência / retenção / conversão
| Bloco | Findings | Intensidade |
|-------|----------|-------------|
| E1 Residuais opcionais (Aprofundar rename, chips, bloqueado=1, draft user-scope) | MAE-P3-* | média cada |
| **Só após** A/D e humanos críticos | — | valor pós |

### TRILHA F — Operação / incidentes
| Bloco | Findings | Intensidade |
|-------|----------|-------------|
| F1 Runbooks 20 cenários (curtos) | MAE-P1-06 | alta |
| F2 Matriz acessos key-person | UG-18 | pequena |
| F3 Health honesty note in ops docs | UG-28 | pequena |

### TRILHA G — Testes / E2E
| Bloco | Decisão |
|-------|---------|
| G1 | **Não instalar Playwright** |
| G2 | Manter real-usage ≥108; 1 teste UI crise×upsell após A1 |
| G3 | Investigar sharp advisory sem bump cego |

### TRILHA H — Pós-lançamento
Search server-side, streaming, exclusão self-service, deepen persistido, observabilidade agregada, MFA admin, CI GitHub, receita Stripe admin.

### TRILHA I — Não gastar créditos
- Refactors cosméticos / renomeações amplas
- Testes redundantes de strings
- Features voz/PWA/i18n/affiliates
- Documentação paralela duplicando matriz
- Otimização prematura virtualização chat
- Arquitetura nova sem problema comprovado
- `pnpm install` / lockfile churn
- Normalizar CRLF de `repositories/index.ts`

---

## Sequência recomendada absoluta

1. **Humano:** B00 remoto + health SHA (`AMEM_HUMAN_MINIMAL_ACTIONS`).
2. **Humano:** postcheck 008 + confirmar 005–007.
3. **Humano:** decidir MIG 004 (sim/não/adiar) com backup.
4. **Humano:** pastoral 21 etapas + smoke Jornadas residual.
5. **Humano:** smoke financeiro test (prep existente).
6. **Cursor A1:** esconder upsell Aprofundar em contexto de crise.
7. **Cursor D1:** alinhar docs cookie Domain + theology crisis.
8. **Cursor C1+C2:** checklist financeiro + chargeback playbook.
9. **Cursor B1:** pacote decisão 004 (sem apply).
10. **Cursor D2:** kill switch design (± implementação mínima).
11. **Cursor A2+A3:** stable codes + robots.
12. **Cursor F1+F2:** runbooks ops + acessos.
13. **Cursor G3:** advisory sharp (investigação).
14. **Só então:** cutover deploy humano.
15. **Pós:** trilha H conforme métricas reais.

---

## Prompts prontos (copiar para Cursor)

### Prompt 1 — A1 Crisis×upsell (prioridade)
```
Escopo: ocultar DeepUpsellHint / CTAs de Aprofundar no chat quando a conversa tiver resposta de crise (model crisis_safety ou detectCrisis no thread), sem alterar quotas, prompts teológicos, entitlements, Stripe, migrations.

Arquivos prováveis: src/components/chat/chat-panel.tsx, chat-plan-upsell.tsx, tests/crisis-safety.test.ts ou novo teste real-usage.

Gates: pnpm test (subset + real-usage afetado), lint, build. Não tocar repositories/index.ts. Sem git add .

Parar se precisar de schema ou mudar copy pastoral ampla.
```

### Prompt 2 — D1 Docs cookie + theology
```
Somente docs: alinhar LAUNCH_CHECKLIST e AUTH_EMAIL_TEMPLATES ao código Domain=.amemchat.com.br em Vercel Production (src/lib/supabase/auth-cookie-options.ts). Corrigir THEOLOGY_EVALUATIONS.md que ainda diz crisis prompt-only — apontar intercept runtime em chat-service. Não alterar código. Diff só docs/. Commit docs: se pedido.
```

### Prompt 3 — C1 Financial tests list
```
Atualizar docs/_ai financeiros (smoke prep) com a lista de 12 testes da AMEM_TEST_COVERAGE_AND_FAILURE_MODE_MATRIX_2026-07-21.md seção 8. Não chamar Stripe. Não alterar billing code. Não implementar proration.
```

### Prompt 4 — B1 MIG 004 decision pack
```
Produzir docs/_ai pacote de decisão MIG 004: riscos apply vs não apply (DATABASE.md + migration file), SQL read-only de verificação, rollback manual conditions, sem executar SQL, sem apply, sem editar migrations. Incluir pré-requisito backup.
```

### Prompt 5 — D2 Kill switch design
```
Desenhar (e só implementar se couber em env flags já usadas) kill switches para desligar Chat / Jornadas / Aprofundar via env server-side fail-closed, com testes e docs. Sem remote, sem Stripe, sem migrations. Parar se exigir schema.
```

### Prompt 6 — A2 Stable error codes
```
Estender src/lib/observability/stable-error-codes.ts para incluir códigos realmente emitidos (ai_identity_violation, personalization_required, etc.) com testes. Não mudar comportamento de erro. Gates: test subset + lint.
```

### Prompt 7 — A3 Robots jornadas
```
Adicionar /jornadas e /jornadas/ ao disallow de src/app/robots.ts (produção), espelhando private-paths. Teste seo-social-readiness. Sem outras mudanças SEO de marca.
```

### Prompt 8 — F1 Ops runbooks
```
Criar docs/_ai/AMEM_OPS_INCIDENT_RUNBOOKS_MINIMAL.md cobrindo os 20 cenários da auditoria-mestre (detectar, quem, ação, limite, escalonamento). Somente docs. Sem secrets.
```

### Prompt 9 — F2 Access matrix
```
Criar docs/_ai/AMEM_OPERATOR_ACCESS_MATRIX.md: Vercel, Supabase, Stripe, OpenAI, DNS, Instagram, e-mail — papéis, rotação, offboarding. Somente docs. Sem valores de secrets.
```

### Prompt 10 — G3 sharp advisory
```
Investigar GHSA sharp via next (pnpm audit --prod). Documentar explorabilidade no runtime Amém Chat e opção de wait-for-Next vs override. Não alterar pnpm-lock.yaml sem evidência e aprovação. Somente doc se incerto.
```

### Prompt 11 — D3 exclusão manual
```
Documentar processo humano de exclusão de conta (suporte): dados a apagar (Auth, profile, messages, journeys, Stripe customer note), evidências, prazo. Alinhar USER_DATA_PORTABILITY. Sem implementar self-service.
```

### Prompt 12 — E1 residual drafts user-scope (pós-launch ou se sobrar)
```
Tornar composer drafts user-scoped (userId no key) + migração best-effort de keys antigas + testes privacy. Sem schema. Não tocar repositories/index.ts.
```

### Prompt 13 — Pós H streaming (não agora)
```
Spike-only doc: streaming /api/chat tradeoffs, abort, custo, teologia. Sem implementação.
```

---

## Intensidade × valor (resumo)

| Alta intensidade | Alto valor launch | Baixo valor / não gastar |
|------------------|-------------------|---------------------------|
| F1 runbooks | A1 crise×upsell; D1 docs perigosos; humanos B00/004/fin | Playwright; PWA; voz; refactors |
| D2 kill switch | C1 smoke list | coverage % tooling |
| — | B1 pacote 004 | short_memory bikeshed |

---

## Condições de parada globais (todas as execuções futuras)

Parar sem commit se: teste vermelho, build vermelho, diff produtivo inesperado, repositories/index.ts staged, lockfile alterado, secret em output, necessidade de migration/remoto/Stripe/deploy sem pedido explícito.
