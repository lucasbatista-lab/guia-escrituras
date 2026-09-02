import { partialParse } from "openai/_vendor/partial-json-parser/parser";
import { looksLikeStructuredJsonLeak } from "./chat-stream-protocol";

/**
 * Extract the human `answer` field from an official Responses API
 * output_text snapshot while Structured Outputs JSON is still incomplete.
 *
 * Uses OpenAI's SDK `partialParse` (same helper as Chat Completions
 * structured-output streaming) — not a hand-rolled JSON parser.
 */
export function extractStreamedAnswer(jsonSnapshot: string): string | null {
  const raw = jsonSnapshot.trim();
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = partialParse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const answer = (parsed as { answer?: unknown }).answer;
  if (typeof answer !== "string") return null;

  const visible = answer.replace(/\r\n/g, "\n");
  if (!visible.trim()) return null;
  if (looksLikeStructuredJsonLeak(visible)) return null;
  return visible;
}
