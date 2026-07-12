import type { BiblicalReference } from "@/lib/biblical";
import type { TheologyPolicy } from "@/lib/theology";

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
}

export interface AiGenerateResult {
  answer: string;
  biblicalReferences: BiblicalReference[];
  interpretationNotice: string;
  followUpQuestion?: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
  provider: "openai" | "mock";
}

export interface AiProvider {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>;
}
