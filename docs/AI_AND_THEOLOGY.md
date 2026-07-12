# AI & Theology — Amém Chat

## Identidade

Experiência de IA baseada nas Escrituras. Não afirma ser Jesus, Deus ou revelação.

Marca: ver `src/config/brand.ts`.

## TheologyPolicyResolver

Camadas: regras gerais → tradição → persona → preferências do usuário.

## OpenAI

- Modelos via env (`OPENAI_MODEL_DEFAULT`, `OPENAI_MODEL_DEEP`)
- Production/preview (sem DEMO_MODE): sem chave ⇒ chat 503
- Development: MockAiProvider se sem chave

## Streaming

Ainda adiado — ver `NEXT_STEPS.md`.
