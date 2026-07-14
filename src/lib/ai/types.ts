import type { BiblicalReference } from "@/lib/biblical";
import type { BiblicalGroundingResult } from "@/lib/biblical/curated-types";
import type { TheologyPolicy } from "@/lib/theology";
import type { ChatResponseDepth } from "./response-depth";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiGenerateInput {
  messages: ChatMessage[];
  theologyPolicy: TheologyPolicy;
  model: string;
  conversationSummary?: string | null;
  requestId: string;
  /** Curated biblical grounding for this turn (required in production path). */
  grounding: BiblicalGroundingResult;
  responseDepth?: ChatResponseDepth;
}

export interface AiGenerateResult {
  answer: string;
  biblicalReferences: BiblicalReference[];
  interpretationNotice: string;
  followUpQuestion?: string;
  /** Internal continuity memory — never expose on the public chat API. */
  conversationMemory: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
  provider: "openai" | "mock";
  groundingProvider: "curated_v1";
  retrievedReferenceIds: string[];
  groundingCount: number;
}

export interface AiProvider {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>;
}
