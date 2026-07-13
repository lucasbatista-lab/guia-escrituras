import type { ChatResponseDepth } from "./response-depth";
import type { ReasoningEffort } from "openai/resources/shared";

/**
 * OpenAI Responses API knobs for grounded chat.
 * Env vars are optional; defaults are conservative and safe without Vercel config.
 */
export function getOpenAiReasoningEffortDefault(): ReasoningEffort {
  const raw = process.env.OPENAI_REASONING_EFFORT_DEFAULT?.trim().toLowerCase();
  const allowed: ReasoningEffort[] = [
    "none",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
  ];
  if (raw && (allowed as string[]).includes(raw)) {
    return raw as ReasoningEffort;
  }
  // Low effort for common chat — reduces latency/cost on reasoning models.
  return "low";
}

const DEFAULT_MAX_OUTPUT: Record<ChatResponseDepth, number> = {
  // Leave headroom so reasoning + JSON schema do not exhaust the budget.
  brief: 2_500,
  balanced: 4_000,
  deep: 6_000,
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 800 ? n : fallback;
}

export function getMaxOutputTokensForDepth(depth: ChatResponseDepth): number {
  if (depth === "brief") {
    return parsePositiveInt(
      process.env.OPENAI_MAX_OUTPUT_TOKENS_BRIEF,
      DEFAULT_MAX_OUTPUT.brief,
    );
  }
  if (depth === "deep") {
    return parsePositiveInt(
      process.env.OPENAI_MAX_OUTPUT_TOKENS_DEEP,
      DEFAULT_MAX_OUTPUT.deep,
    );
  }
  return parsePositiveInt(
    process.env.OPENAI_MAX_OUTPUT_TOKENS_BALANCED,
    DEFAULT_MAX_OUTPUT.balanced,
  );
}

export { DEFAULT_MAX_OUTPUT as OPENAI_MAX_OUTPUT_TOKEN_DEFAULTS };
