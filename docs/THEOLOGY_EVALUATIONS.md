# Theology & Safety Evaluations — Amém Chat

## Objetivo

Harness **offline**, determinístico e reutilizável para avaliar:

- qualidade teológica (identidade, revelação, cura, prosperidade, ódio, manipulação);
- segurança pastoral (crise, autocastigo, encaminhamento humano);
- grounding bíblico (referências fabricadas, não recuperadas, falsa literalidade);
- resistência a jailbreak / vazamento de prompt ou segredos.

O harness **não** altera `/api/chat` e **não** conecta os novos validadores ao fluxo live.

## O que ele mede

| Modo | O que mede |
|------|------------|
| **fixture** | Se a rubrica/detectores classificam corretamente respostas seguras vs inseguras escritas para o teste |
| **offline_mock** | Integração CuratedBiblicalProvider + MockAiProvider + normalização + avaliador |

## O que ele **não** mede

- Qualidade real das respostas da **OpenAI** em produção;
- Tom pastoral fino que exige julgamento humano;
- Cobertura completa de paráfrases adversariais;
- O “fluxo seguro” de crise no produto (hoje só existe como regra de prompt).

Resultados `offline_mock` são rotulados como mock e **não** devem ser lidos como score live.

## Como executar

```bash
pnpm eval:theology      # fixtures + pipeline mock + relatórios em tmp/theology-evals/
pnpm eval:theology:ci   # contrato determinístico de fixtures (exit != 0 se falhar)
```

Também coberto por:

```bash
pnpm exec vitest run tests/evals/theology
```

Relatórios JSON/Markdown vão para `tmp/theology-evals/` (gitignored).

## Como adicionar cenários

1. Crie um cenário com `defineScenario` em `src/lib/evals/theology/scenarios/`.
2. Inclua **pelo menos** um fixture `intendedPass: true` e um `intendedPass: false`.
3. Exporte no `scenarios/index.ts`.
4. Rode `pnpm eval:theology:ci`.

Campos úteis:

- `crisisSupportRequired` — exige linguagem de apoio humano/profissional;
- `allowMissingBiblicalRefs` — não exige citações;
- `allowedReferences` — allow-list para checagem de grounding em fixtures.

## Como interpretar falhas

| Sintoma | Leitura |
|---------|---------|
| Fixture **safe** falha | Falso positivo do detector — ajustar com teste de negação |
| Fixture **unsafe** passa | Lacuna da rubrica — reforçar detector (ainda **sem** ligar ao chat) |
| `offline_mock` falha | Mock/curated/normalização divergiram do esperado seguro |
| Relatório aponta gaps | Dívida conhecida do produto (prompt-only, crise não implementada, etc.) |

## Ausência de chamadas reais

Por padrão **não há** chamada OpenAI, Stripe, Supabase remoto ou rede.  
Mesmo com `OPENAI_API_KEY` presente, o pipeline usa apenas `MockAiProvider`.

## Revisão humana

Falhas críticas e novos cenários pastorais devem passar por **revisão teológica humana** antes de qualquer endurecimento no path live.

## Avaliação live futura (não implementada)

Uma avaliação live só deve existir sob decisão explícita (flag/comando separado, amostragem, custo e revisão). **Não** está implementada neste bloco.

## Arquivos

- `src/lib/evals/theology/*` — schemas, rubrica, detectores, runner, cenários
- `tests/evals/theology/*` — testes e CLI
- `scripts/run-theology-eval.cjs`
- `docs/AI_AND_THEOLOGY.md` — visão geral do stack teológico
