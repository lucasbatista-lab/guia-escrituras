import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./types";
import {
  answerLooksLikeLiteralUnlicensedQuote,
  filterReferencesToGrounding,
} from "@/lib/biblical";
import { AppError } from "@/lib/safety";
import { logger } from "@/lib/logging/logger";

export class MockAiProvider implements AiProvider {
  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const started = Date.now();
    const lastUser = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");

    const topRefs = input.grounding.retrieved.slice(0, 3);
    const refLines = topRefs.map((item) => {
      const { entry } = item;
      return `À luz de ${entry.formattedReference}: ${entry.editorialSummary}`;
    });

    const answer = [
      input.theologyPolicy.identityDisclaimer,
      "",
      "Com base nas Escrituras recuperadas e na tradição selecionada, uma orientação possível é buscar paz, verdade e cuidado concreto com a situação que você descreveu.",
      "",
      ...refLines,
      "",
      "Interpretação: esta é uma reflexão gerada por inteligência artificial, não uma revelação sobrenatural. Os textos acima são sínteses editoriais, não citações literais de uma tradução específica.",
      "",
      "Aplicação prática: dê um passo concreto e sereno hoje — oração breve, conversa honestíssima ou pedido de ajuda humana quando couber.",
      "",
      lastUser
        ? `Você compartilhou: “${lastUser.content.slice(0, 180)}${lastUser.content.length > 180 ? "…" : ""}”.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (answerLooksLikeLiteralUnlicensedQuote(answer)) {
      logger.error("ai_literal_quote_guard", { requestId: input.requestId });
      throw new AppError(
        "ai_invalid_output",
        "ai_invalid_output",
        503,
        "Não foi possível gerar a reflexão agora. Tente novamente.",
      );
    }

    const proposed = topRefs.map((item) => ({
      book: item.entry.book,
      chapter: item.entry.chapter,
      verseStart: item.entry.verseStart,
      verseEnd:
        item.entry.verseEnd !== item.entry.verseStart
          ? item.entry.verseEnd
          : undefined,
    }));

    const { accepted } = filterReferencesToGrounding(
      proposed,
      input.grounding,
      input.requestId,
    );

    return {
      answer,
      biblicalReferences: accepted,
      interpretationNotice:
        "Referências e interpretações baseadas nas Escrituras. Nesta versão, os textos são apresentados por referência e síntese, não como reprodução integral de uma tradução bíblica específica.",
      followUpQuestion:
        "Há algum detalhe da sua situação que você gostaria de trazer com mais calma?",
      inputTokens: 320,
      outputTokens: 180,
      model: input.model || "mock",
      latencyMs: Date.now() - started,
      provider: "mock",
      groundingProvider: "curated_v1",
      retrievedReferenceIds: input.grounding.retrievedReferenceIds,
      groundingCount: input.grounding.groundingCount,
    };
  }
}
