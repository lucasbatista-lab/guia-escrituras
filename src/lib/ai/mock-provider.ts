import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./types";
import {
  answerLooksLikeLiteralUnlicensedQuote,
  filterReferencesToGrounding,
} from "@/lib/biblical";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";
import { getResponseDepthGuidance } from "./response-depth";
import { AppError } from "@/lib/safety";
import { logger } from "@/lib/logging/logger";

export class MockAiProvider implements AiProvider {
  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const started = Date.now();
    const lastUser = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");
    const depth = input.responseDepth ?? "balanced";
    const guidance = getResponseDepthGuidance(depth);
    const topRefs = input.grounding.retrieved.slice(
      0,
      guidance.referenceCount.max,
    );

    const refReflection = topRefs
      .map((item) => {
        const { entry } = item;
        return `À luz de ${entry.formattedReference}, ${entry.editorialSummary.replace(/^Em síntese,\s*/i, "").replace(/^A passagem ensina\s*/i, "").replace(/^À luz desse texto,\s*/i, "")}`;
      })
      .join(" ");

    const steps =
      depth === "brief"
        ? [
            "1. Faça uma pausa breve e leve a preocupação a Deus em oração simples.",
            "2. Escolha um próximo passo concreto e pequeno para hoje.",
            "3. Se a angústia for intensa, peça apoio a alguém de confiança.",
          ]
        : depth === "deep"
          ? [
              "1. Nomeie com honestidade o que mais pesa agora.",
              "2. Leve isso a Deus em oração sem pressa de “resolver tudo”.",
              "3. Escolha um cuidado prático concreto para as próximas 24 horas.",
              "4. Compartilhe com alguém seguro, se fizer sentido.",
              "5. Volte amanhã a uma passagem que tocou você e note um detalhe novo.",
            ]
          : [
              "1. Respire e diga a Deus, em poucas palavras, o que está sentindo.",
              "2. Escolha um gesto concreto de cuidado para este dia.",
              "3. Se precisar, peça ajuda humana adequada além da reflexão espiritual.",
              "4. Relacionar a passagem ao próximo passo, sem cobrança.",
            ];

    const answer = [
      lastUser
        ? `Obrigado por trazer isso com honestidade. Ouço o peso em: “${lastUser.content.slice(0, 120)}${lastUser.content.length > 120 ? "…" : ""}”.`
        : "Obrigado por trazer sua situação com honestidade.",
      "",
      refReflection ||
        "Com base nas Escrituras recuperadas, há convite à confiança serena e ao cuidado concreto.",
      "",
      "Para este momento:",
      ...steps.slice(0, guidance.maxApplications),
    ].join("\n");

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
      biblicalReferences: accepted.slice(0, guidance.referenceCount.max),
      interpretationNotice: SHORT_INTERPRETATION_NOTICE,
      followUpQuestion:
        "Há algum detalhe dessa situação que você gostaria de trazer com mais calma?",
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
