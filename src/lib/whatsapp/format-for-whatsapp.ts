import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import { WHATSAPP_OUTBOUND_TEXT_MAX } from "@/lib/whatsapp/config";

/**
 * Deterministic WhatsApp presentation — no second LLM call.
 * Prefer structured fields from the chat motor; never invent content.
 */

function formatReference(ref: {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;
}): string {
  const end =
    ref.verseEnd && ref.verseEnd !== ref.verseStart
      ? `-${ref.verseEnd}`
      : "";
  return `${ref.book} ${ref.chapter}:${ref.verseStart}${end}`;
}

function stripUiArtifacts(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*\|.*\|$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function joinParts(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Build a single plain-text WhatsApp message from a completed chat payload.
 */
export function formatForWhatsApp(
  payload: ChatResponsePayload,
  options?: { maxCharacters?: number },
): string {
  const max = options?.maxCharacters ?? WHATSAPP_OUTBOUND_TEXT_MAX;
  const isCrisis = payload.safetyMode === "crisis";

  const answer = stripUiArtifacts(payload.answer);
  const followUp = payload.followUpQuestion?.trim() || "";
  const primaryRef =
    payload.biblicalReferences?.[0] != null
      ? formatReference(payload.biblicalReferences[0])
      : "";

  // Crisis: never truncate — return full answer (+ notice if present and short).
  if (isCrisis) {
    const crisisParts = [answer];
    const notice = stripUiArtifacts(payload.interpretationNotice ?? "");
    if (notice && notice.length <= 280) crisisParts.push(notice);
    return joinParts(crisisParts);
  }

  const parts: string[] = [answer];
  if (primaryRef) {
    parts.push(`Escritura: ${primaryRef}`);
  }
  if (followUp) {
    parts.push(followUp);
  }

  let text = joinParts(parts);
  if (text.length <= max) return text;

  // Structured fallback: answer + one ref + follow-up, shrink answer last.
  const suffixParts: string[] = [];
  if (primaryRef) suffixParts.push(`Escritura: ${primaryRef}`);
  if (followUp) suffixParts.push(followUp);
  const suffix = joinParts(suffixParts);
  const budget = Math.max(80, max - (suffix ? suffix.length + 2 : 0));

  let core = answer;
  if (core.length > budget) {
    // Prefer paragraph boundary; never mid-word if avoidable.
    const sliced = core.slice(0, budget);
    const lastBreak = Math.max(
      sliced.lastIndexOf("\n\n"),
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("! "),
      sliced.lastIndexOf("? "),
    );
    core =
      lastBreak > budget * 0.4
        ? sliced.slice(0, lastBreak + 1).trim()
        : sliced.replace(/\s+\S*$/, "").trim();
    if (!core.endsWith(".") && !core.endsWith("!") && !core.endsWith("?")) {
      core = `${core}…`;
    }
  }

  text = joinParts([core, ...suffixParts]);
  if (text.length > max) {
    // Absolute safety: keep crisis-safe rule N/A here; soft clamp at max
    // on a paragraph boundary only.
    return text.slice(0, max).replace(/\s+\S*$/, "").trim();
  }
  return text;
}
