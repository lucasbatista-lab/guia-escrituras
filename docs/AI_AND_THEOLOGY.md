# AI & Theology — Amém Chat

## Identidade

Experiência de IA baseada nas Escrituras. Não afirma ser Jesus, Deus ou revelação.

Marca: ver `src/config/brand.ts`.

## TheologyPolicyResolver

Camadas: regras gerais → tradição → persona → preferências do usuário.

Arquivos: `src/lib/theology/*`.

## Proteções atuais (produto)

| Camada | Onde | Escopo |
|--------|------|--------|
| Regras de prompt | `general-rules.ts` + resolver | Identidade, revelação, cura/prosperidade, crise (instrucional) |
| **Fluxo seguro de crise (runtime)** | `src/lib/safety/crisis/*` + `chat-service` | Detecção multi-sinal PT-BR; resposta fixa localizada (BR); **sem** chamada ao modelo; log só categoria |
| Output gate (OpenAI) | `assertSafeAiIdentity` em `provider-output.ts` | Regex estreita de personificação/revelação |
| Grounding | `CuratedBiblicalProvider` + `filterReferencesToGrounding` | Só refs estruturadas do conjunto recuperado |
| Literalidade | `answerLooksLikeLiteralUnlicensedQuote` | Heurística suave |
| Mock offline | `MockAiProvider` | Respostas determinísticas seguras (dev/preview) |

**Lacunas conhecidas:** ódio/prosperidade/cura majoritariamente prompt-only; citações no texto livre da `answer` não são varridas; mock não passa por `assertSafeAiIdentity`. Crise imediata: intercept runtime V1 ativo (ver `safety/crisis`); revisão pastoral humana ainda recomendada para calibragem de falsos positivos.

## OpenAI

- Modelos via env (`OPENAI_MODEL_DEFAULT`, `OPENAI_MODEL_DEEP`)
- Production/preview (sem DEMO_MODE): sem chave ⇒ chat 503
- Development: MockAiProvider se sem chave

## Streaming

Ainda adiado — ver `NEXT_STEPS.md`.

## Avaliações offline (harness)

Ver **`docs/THEOLOGY_EVALUATIONS.md`**.

```bash
pnpm eval:theology
pnpm eval:theology:journeys
pnpm eval:theology:ci
```

`eval:theology:journeys` validates the 21 editorial journey steps offline (registry only, no OpenAI). See `docs/READING_JOURNEYS.md`.

Os avaliadores do harness **não** estão conectados a `/api/chat`. Servem para regressão editorial e planejamento de endurecimento futuro.
