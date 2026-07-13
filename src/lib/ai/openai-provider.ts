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
    const system = [
      ...input.theologyPolicy.composedSystemPromptSections,
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
    ].join("\n");

    const conversation = input.messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n");

    const userPrompt = [
      input.conversationSummary
        ? `Resumo da conversa:\n${input.conversationSummary}\n`
        : "",
      "Mensagens:",
      conversation,
      "",
      "Pergunta atual: use a última mensagem do usuário como foco principal.",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await this.client.responses.create({
      model: input.model,
      input: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "chat_reflection",
          strict: true,
          schema: AI_PROVIDER_JSON_SCHEMA,
        },
      },
    });

    const raw = extractOutputText(response);
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

    const usage = response.usage;

    return {
      answer: content.answer,
      biblicalReferences: accepted,
      interpretationNotice: content.interpretationNotice,
      followUpQuestion: content.followUpQuestion ?? undefined,
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
