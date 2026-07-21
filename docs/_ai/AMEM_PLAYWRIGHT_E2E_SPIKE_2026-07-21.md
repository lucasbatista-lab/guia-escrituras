# Playwright / E2E Spike — 2026-07-21

**Decisão:** **DEFER** — não instalar Playwright nesta sprint.  
**HEAD de referência (spike):** pós `69700d7` (histórico retenção).  
**Backlog:** B03.

## Critérios de adoção (todos obrigatórios)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Rodar local sem produção | Parcial | Só `pnpm dev` + mocks; `next start` ⇒ `NODE_ENV=production` ⇒ `allowsMocks() === false` (`src/config/runtime.ts`) |
| Sem credenciais reais | Sim (dev vazio) | Supabase/OpenAI/Stripe opcionais em development |
| Sem chamada OpenAI | Condicional | `createAiProvider()` usa OpenAI real se `OPENAI_API_KEY` estiver setada |
| Sem Stripe | Sim se não clicar billing | Checkout não é exercitado |
| Fixtures determinísticas multi-plano | **Não** | Demo auth fixo `caminho` + `isAdmin` (`src/lib/auth/session.ts`); sem login fixture |
| Execução documentada | **Não** (até este spike) | Sem `playwright.config.ts` / `test:e2e` |
| Não quebrar gates atuais | Sim | Sem `.github/workflows`; gates = vitest/lint/build/evals locais |

**Conclusão:** critérios de adoção **não** são todos verdadeiros → **não instalar**.

## Achados bloqueadores

1. **`pnpm build && pnpm start` + DEMO_MODE não libera mocks** em production runtime (`getAppRuntime()` + `allowsMocks()`). O plano de testes que assume isso está desatualizado.
2. **Persona demo única** — não cobre Essencial vs Caminho vs admin sem harness novo.
3. **Jornadas em runtime** usam repositório Supabase (não memory) nas rotas live → E2E de progresso exige secret/admin client.
4. **Memory repositories** não são singleton de processo no path live → histórico/chat instáveis entre requests sob mock.
5. Proxy **com** Supabase redireciona anônimo; **sem** Supabase + mocks, rotas privadas passam — asserts E2E-A divergem por env.

## Riscos de flakiness (se forçado agora)

- Env drift (`.env.local` com OpenAI key)
- Host `localhost` vs `127.0.0.1` + cookies de aquisição
- Rate limit / turn lock process-local com workers paralelos
- `force-dynamic` em toda platform (latência/auth em cada nav)

## Mitigação adotada nesta sprint

Fortalecer a pirâmide **Vitest real-usage** (B02) com contratos dos 8 fluxos críticos do backlog E2E, sem browser:

- anônimo ↔ rotas privadas
- Essencial preview jornadas / Caminho acesso
- prefill sem auto-send
- crisis intercept sem OpenAI
- admin sem permissão
- `/ajuda` classificação suporte
- navegação mobile admin (já coberta)

Arquivos: `tests/real-usage-e2e-critical-flows.test.ts` + script `pnpm test:real-usage`.

## Pré-requisitos para revisitar Playwright

1. Store demo process-scoped (ou Supabase local container).
2. `getJourneyProgressRepository()` com fallback memory sob `allowsMocks()`.
3. Personas de teste injetáveis (cookie/header test-only) **ou** auth fixture sem secrets.
4. `pnpm test:e2e` documentado usando **`next dev`** **ou** flag de runtime não-production explícita (nunca `DEMO_MODE` em production).
5. Env do webServer **proíbe** `OPENAI_API_KEY` / Stripe secrets.
6. Suíte inicial ≤ 8 smokes; não entrar nos gates até flakiness &lt; limiar acordado.

## O que não fazer

- Instalar Playwright “só para marcar checkbox”
- Ligar E2E vermelho aos gates atuais
- Usar produção, contas reais, OpenAI ou Stripe live
