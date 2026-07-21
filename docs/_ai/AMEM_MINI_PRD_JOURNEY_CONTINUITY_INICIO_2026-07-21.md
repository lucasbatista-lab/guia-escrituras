# Mini-PRD — Continuidade de Jornadas no Início (Caminho+)

**Data:** 2026-07-21  
**Plano elegível:** Caminho, Profundo, Particular (`reading_journeys`)  
**Escopo:** M · sem migration · sem Stripe · sem OpenAI

## Comportamento

No `/inicio`, o card de Jornadas destaca a jornada em andamento com:

- título da jornada;
- título da **próxima etapa** (determinístico via `currentStepId` já persistido);
- CTA que abre diretamente `/jornadas/{slug}/{step}` quando houver etapa atual;
- diferenciação clara entre “Continuar etapa” e “Ver jornadas”.

## Limites

- Sem resumo gerado por IA;
- Sem inferência psicológica;
- Sem novos campos de schema;
- Essencial continua vendo apenas preview + CTA planos.

## Teologia

Copy editorial existente das jornadas; não afirma revelação.

## Estados

- Sem progresso: “Ver jornadas”
- Em andamento: “Continuar: {etapa}”
- Concluídas: contagem mantida
