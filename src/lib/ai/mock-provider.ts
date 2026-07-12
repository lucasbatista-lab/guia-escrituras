import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./types";

export class MockAiProvider implements AiProvider {
  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const started = Date.now();
    const lastUser = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");

    const answer = [
      input.theologyPolicy.identityDisclaimer,
      "",
      "Com base nos Evangelhos e na tradição selecionada, uma orientação possível é buscar paz, verdade e cuidado concreto com a situação que você descreveu.",
      "",
      "À luz de Mateus 11:28-30 (referência), o convite é trazer o cansaço a Cristo em oração e dar o próximo passo prático com mansidão — sem pressa e sem culpa.",
      "",
      "Interpretação: esta é uma reflexão gerada por inteligência artificial, não uma revelação sobrenatural.",
      "",
      lastUser
        ? `Você compartilhou: “${lastUser.content.slice(0, 180)}${lastUser.content.length > 180 ? "…" : ""}”.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      answer,
      biblicalReferences: [
        {
          book: "Mateus",
          chapter: 11,
          verseStart: 28,
          verseEnd: 30,
        },
      ],
      interpretationNotice:
        "Esta resposta distingue citação (referência), interpretação e aplicação prática. Trechos textuais completos de traduções licenciadas ainda não estão integrados.",
      followUpQuestion:
        "Há algum detalhe da sua situação que você gostaria de trazer com mais calma?",
      inputTokens: 320,
      outputTokens: 180,
      model: input.model || "mock",
      latencyMs: Date.now() - started,
      provider: "mock",
    };
  }
}
