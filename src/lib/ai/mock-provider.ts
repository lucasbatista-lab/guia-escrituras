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
    const currentUser = input.currentUserMessage.trim();
    const depth = input.responseDepth ?? "balanced";
    const guidance = getResponseDepthGuidance(depth);
    const topRefs = input.grounding.retrieved.slice(
      0,
      Math.max(1, Math.min(guidance.referenceCount.max, 2)),
    );

    const primaryRef = topRefs[0];
    const refLine = primaryRef
      ? `À luz de ${primaryRef.entry.formattedReference}, ${primaryRef.entry.editorialSummary
          .replace(/^Em síntese,\s*/i, "")
          .replace(/^A passagem ensina\s*/i, "")
          .replace(/^À luz desse texto,\s*/i, "")}`
      : null;

    const step =
      depth === "deep"
        ? "Um passo possível: nomeie o que mais pesa, ore sem pressa de resolver tudo, e escolha um cuidado concreto para as próximas 24 horas."
        : "Um passo possível hoje: diga a Deus, em poucas palavras, o que está sentindo — e escolha um gesto pequeno e concreto.";

    const answer = [
      currentUser
        ? `Obrigado por trazer isso. Ouço o peso em: “${currentUser.slice(0, 100)}${currentUser.length > 100 ? "…" : ""}”.`
        : "Obrigado por trazer sua situação.",
      "",
      "Vamos organizar o que você trouxe sem forçar um sermão.",
      refLine ??
        "Quando a Escritura ajudar, usamos a passagem recuperada; se não couber agora, seguimos no que é concreto.",
      "",
      step,
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

    input.onAnswerSnapshot?.(answer.slice(0, Math.min(48, answer.length)));
    input.onAnswerSnapshot?.(answer);

    const needsFollowUp =
      currentUser.length > 0 &&
      currentUser.length < 40 &&
      !/[.!?]$/.test(currentUser);

    return {
      answer,
      biblicalReferences: accepted.slice(0, guidance.referenceCount.max),
      interpretationNotice: SHORT_INTERPRETATION_NOTICE,
      followUpQuestion: needsFollowUp
        ? "Há algum detalhe concreto dessa situação que queira trazer?"
        : "",
      conversationMemory: [
        input.conversationSummary
          ? `Continuidade: ${input.conversationSummary.slice(0, 280)}`
          : null,
        currentUser
          ? `Situação atual: ${currentUser.slice(0, 200)}`
          : "Situação atual: reflexão espiritual.",
        "Orientação: acolhimento bíblico e próximo passo concreto.",
        "Ponto aberto: detalhe adicional da situação.",
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 1000),
      inputTokens: 320,
      outputTokens: 180,
      model: input.model || "mock",
      latencyMs: Date.now() - started,
      provider: "mock",
      groundingProvider: "curated_v1",
      retrievedReferenceIds: input.grounding.retrievedReferenceIds,
      groundingCount: input.grounding.groundingCount,
      streamed: true,
      openaiTtftMs: 0,
      openaiCompleteMs: Date.now() - started,
    };
  }
}
