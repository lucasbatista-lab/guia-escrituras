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
  /** Exact current user utterance for this turn — never infer from history. */
  currentUserMessage: string;
  theologyPolicy: TheologyPolicy;
  model: string;
  conversationSummary?: string | null;
  requestId: string;
  /** Curated biblical grounding for this turn (required in production path). */
  grounding: BiblicalGroundingResult;
  responseDepth?: ChatResponseDepth;
  abortSignal?: AbortSignal;
  /** Human-visible answer snapshots only — never raw JSON. */
  onAnswerSnapshot?: (answer: string) => void;
  onStreamTelemetry?: (event: {
    openaiStreamStartedAt?: number;
    openaiFirstDeltaAt?: number;
  }) => void;
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
  streamed?: boolean;
  openaiTtftMs?: number | null;
  openaiCompleteMs?: number;
}

export interface AiProvider {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>;
}
