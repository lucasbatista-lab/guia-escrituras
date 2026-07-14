import OpenAI from "openai";
import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./types";
import {
  AI_PROVIDER_JSON_SCHEMA,
  parseAndValidateAiProviderContent,
} from "./provider-output";
import {
  answerLooksLikeLiteralUnlicensedQuote,
  buildGroundingPromptSection,
  filterReferencesToGrounding,
} from "@/lib/biblical";
import {
  getMaxOutputTokensForDepth,
  getOpenAiReasoningEffortDefault,
} from "./openai-config";
import { getResponseDepthGuidance } from "./response-depth";
import {
  buildConversationMemoryPromptGuidance,
  sanitizeConversationMemory,
} from "./conversation-memory";
import { logger } from "@/lib/logging/logger";
import { AppError } from "@/lib/safety";

function extractOutputText(response: {
  output_text?: string;
  output?: unknown;
}): string {
  if (response.output_text?.trim()) {
    return response.output_text;
  }

  const parts: string[] = [];
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = "content" in item ? item.content : undefined;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        parts.push(part.text);
      }
    }
  }

  return parts.join("\n").trim();
}

/**
 * OpenAI Responses API provider with structured outputs + Zod validation.
 * Streaming is intentionally deferred.
 */
export class OpenAiResponsesProvider implements AiProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const started = Date.now();
    const depth = input.responseDepth ?? "balanced";
    const depthGuidance = getResponseDepthGuidance(depth);
    const maxOutputTokens = getMaxOutputTokensForDepth(depth);
    const reasoningEffort = getOpenAiReasoningEffortDefault();

    const currentQuestion =
      [...input.messages].reverse().find((m) => m.role === "user")?.content ??
      "";

    const system = [
      ...input.theologyPolicy.composedSystemPromptSections,
      "",
      ...depthGuidance.promptLines,
      "",
      ...buildConversationMemoryPromptGuidance(),
      "",
      ...buildGroundingPromptSection(input.grounding),
      "Responda em português do Brasil.",
      "Utilize somente referências presentes no contexto recuperado.",
      "Não invente versículos.",
      "Não apresente paráfrase editorial como citação literal.",
      "Não use aspas para texto bíblico sem fonte textual licenciada.",
      "Use expressões como “em síntese”, “a passagem ensina” ou “à luz desse texto”.",
      "Separe interpretação de aplicação prática.",
      "Nunca afirme ser Jesus, Deus ou uma revelação sobrenatural.",
      "interpretationNotice: uma frase curta sobre referência/síntese (não um essay).",
      "Finalize com no máximo uma pergunta de continuidade (followUpQuestion).",
    ].join("\n");

    const recentBlock = input.messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n");

    const userPrompt = [
      input.conversationSummary
        ? `Resumo compacto da conversa (atualize em conversationMemory):\n${input.conversationSummary}\n`
        : "Ainda não há resumo: após este turno, conversationMemory será o primeiro resumo.\n",
      recentBlock
        ? `Mensagens recentes (não é o histórico completo):\n${recentBlock}\n`
        : "Sem mensagens anteriores além da pergunta atual.\n",
      `Pergunta atual:\n${currentQuestion || "(sem texto)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await this.client.responses.create({
      model: input.model,
      input: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: reasoningEffort },
      text: {
        format: {
          type: "json_schema",
          name: "chat_reflection",
          strict: true,
          schema: AI_PROVIDER_JSON_SCHEMA,
        },
      },
    });

    if (response.status === "incomplete") {
      const reason =
        response.incomplete_details?.reason ?? "unknown_incomplete";
      logger.error("ai_response_incomplete", {
        requestId: input.requestId,
        reason,
        maxOutputTokens,
      });
      throw new AppError(
        "ai_incomplete",
        "ai_incomplete",
        503,
        "Não foi possível concluir a reflexão agora. Tente novamente.",
      );
    }

    const raw = extractOutputText(response);
    if (!raw.trim()) {
      logger.error("ai_empty_output", { requestId: input.requestId });
      throw new AppError(
        "ai_invalid_output",
        "ai_invalid_output",
        503,
        "Não foi possível gerar a reflexão agora. Tente novamente.",
      );
    }

    let content;
    try {
      content = parseAndValidateAiProviderContent(raw);
    } catch (error) {
      logger.error("ai_output_validation_failed", {
        requestId: input.requestId,
        err: error instanceof Error ? error.message : "unknown",
      });
      if (error instanceof AppError) throw error;
      throw new AppError(
        "ai_invalid_output",
        "ai_invalid_output",
        503,
        "Não foi possível gerar a reflexão agora. Tente novamente.",
      );
    }

    if (answerLooksLikeLiteralUnlicensedQuote(content.answer)) {
      logger.error("ai_literal_quote_guard", { requestId: input.requestId });
      throw new AppError(
        "ai_invalid_output",
        "ai_invalid_output",
        503,
        "Não foi possível gerar a reflexão agora. Tente novamente.",
      );
    }

    const mapped = content.biblicalReferences.map((ref) => ({
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
      ...(ref.translation ? { translation: ref.translation } : {}),
    }));

    const { accepted } = filterReferencesToGrounding(
      mapped,
      input.grounding,
      input.requestId,
    );

    const capped = accepted.slice(0, depthGuidance.referenceCount.max);
    const usage = response.usage;
    const conversationMemory = sanitizeConversationMemory(
      content.conversationMemory,
    );

    return {
      answer: content.answer,
      biblicalReferences: capped,
      interpretationNotice: content.interpretationNotice,
      followUpQuestion: content.followUpQuestion ?? undefined,
      conversationMemory,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      model: input.model,
      latencyMs: Date.now() - started,
      provider: "openai",
      groundingProvider: "curated_v1",
      retrievedReferenceIds: input.grounding.retrievedReferenceIds,
      groundingCount: input.grounding.groundingCount,
    };
  }
}
