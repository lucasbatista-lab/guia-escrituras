import {
  allowsMocks,
  assertDemoModeSafe,
  isDemoModeFlag,
  requiresRealOpenAiForChat,
} from "@/config/runtime";
import { MockAiProvider } from "./mock-provider";
import { OpenAiResponsesProvider } from "./openai-provider";
import type { AiProvider } from "./types";
import { AppError } from "@/lib/safety";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function createAiProvider(): AiProvider {
  if (isDemoModeFlag()) {
    try {
      assertDemoModeSafe();
    } catch {
      throw new AppError(
        "openai_unavailable",
        "openai_unavailable",
        503,
        "O chat está temporariamente indisponível.",
      );
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  // Real key always wins — never silently mix Mock with a live provider key.
  if (apiKey) {
    return new OpenAiResponsesProvider(apiKey);
  }

  if (requiresRealOpenAiForChat()) {
    throw new AppError(
      "openai_unavailable",
      "openai_unavailable",
      503,
      "O chat está temporariamente indisponível.",
    );
  }

  if (!allowsMocks()) {
    throw new AppError(
      "openai_unavailable",
      "openai_unavailable",
      503,
      "O chat está temporariamente indisponível.",
    );
  }

  return new MockAiProvider();
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
