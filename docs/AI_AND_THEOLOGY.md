# AI & Theology — Guia Escrituras

## Identidade do produto

A plataforma **não** afirma ser Jesus, Deus ou revelação sobrenatural. É uma experiência de IA com reflexões baseadas nas Escrituras e na tradição selecionada.

Aviso padrão (`IDENTITY_DISCLAIMER`) entra em toda política composta.

## TheologyPolicyResolver

Entrada: tradição, persona, preferências do usuário.  
Saída: seções de system prompt + flags (ex.: `allowsSaintsContent`).

Camadas:

1. **Geral** — não alegar divindade, não prometer milagres, distinguir citação/interpretação/aplicação, não substituir profissionais, não pressionar compra  
2. **Tradição** — ecumênica / evangélica / católica  
3. **Persona** — Jesus (Evangelhos), Paulo (cartas), Pedro (inativo), Maria (se política permitir)  
4. **Preferências** — estilo, profundidade, tradução preferida, denominação  

## Personas

Dados configuráveis em `src/lib/theology/personas.ts` (+ seed SQL). A UI não deve hardcodar disponibilidade.

## Fontes bíblicas

- Tipos: `BiblicalReference`, `BiblicalPassage`  
- Interface: `BiblicalSourceProvider`  
- Mock: trechos fictícios sempre com `isMock: true` e label **demonstração**  
- Validação de livro/capítulo/versículo  
- Espaço para provider licenciado futuro — **nunca** apresentar mock como citação real  

## Gateway de IA

- `AiProvider`  
- `OpenAiResponsesProvider` (Responses API)  
- `MockAiProvider` se `OPENAI_API_KEY` ausente  

Modelos via env — nunca fixos em componentes.

## Formato da resposta do chat

```json
{
  "answer": "...",
  "biblicalReferences": [{ "book": "Mateus", "chapter": 11, "verseStart": 28, "verseEnd": 30 }],
  "interpretationNotice": "...",
  "followUpQuestion": "...",
  "usage": { "level": "normal", "label": "Uso normal", "inputTokens": 0, "outputTokens": 0 },
  "requestId": "...",
  "conversationId": "...",
  "provider": "mock"
}
```

Streaming: próximo passo (ver `NEXT_STEPS.md`).
