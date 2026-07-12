import { MockAiProvider } from "./mock-provider";
import { OpenAiResponsesProvider } from "./openai-provider";
import type { AiProvider } from "./types";

export function createAiProvider(): AiProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return new MockAiProvider();
  }
  return new OpenAiResponsesProvider(apiKey);
}

export function getDefaultModel(): string {
  return process.env.OPENAI_MODEL_DEFAULT?.trim() || "gpt-4.1-mini";
}

export function getDeepModel(): string {
  return process.env.OPENAI_MODEL_DEEP?.trim() || "gpt-4.1";
}

export function resolveChatModel(options: {
  preferDeep: boolean;
}): string {
  if (options.preferDeep) {
    return getDeepModel();
  }
  return getDefaultModel();
}
