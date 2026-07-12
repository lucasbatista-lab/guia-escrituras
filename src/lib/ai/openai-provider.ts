import OpenAI from "openai";
import type { BiblicalReference } from "@/lib/biblical";
import type { AiGenerateInput, AiGenerateResult, AiProvider } from "./types";

interface StructuredAiPayload {
  answer: string;
  biblicalReferences?: BiblicalReference[];
  interpretationNotice?: string;
  followUpQuestion?: string;
}

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

function parseStructuredPayload(raw: string): StructuredAiPayload {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { answer: raw };
    }
    const parsed = JSON.parse(jsonMatch[0]) as StructuredAiPayload;
    if (!parsed.answer) {
      return { answer: raw };
    }
    return parsed;
  } catch {
    return { answer: raw };
  }
}

/**
 * OpenAI Responses API provider.
 * Streaming is intentionally deferred to keep the first vertical slice stable.
 * See docs/NEXT_STEPS.md.
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
      "Responda em português do Brasil.",
      "Retorne JSON com: answer, biblicalReferences (array de {book, chapter, verseStart, verseEnd?}), interpretationNotice, followUpQuestion (opcional).",
      "Não invente texto de tradução bíblica licenciada; cite apenas referências.",
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
    ]
      .filter(Boolean)
      .join("\n");

    const response = await this.client.responses.create({
      model: input.model,
      input: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = extractOutputText(response);
    const parsed = parseStructuredPayload(raw);
    const usage = response.usage;

    return {
      answer: parsed.answer,
      biblicalReferences: parsed.biblicalReferences ?? [],
      interpretationNotice:
        parsed.interpretationNotice ??
        input.theologyPolicy.identityDisclaimer,
      followUpQuestion: parsed.followUpQuestion,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      model: input.model,
      latencyMs: Date.now() - started,
      provider: "openai",
    };
  }
}
