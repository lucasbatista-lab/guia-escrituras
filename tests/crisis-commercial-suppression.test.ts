import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chatResponseSchema } from "@/lib/ai/chat-schema";
import {
  appendAssistantUiMessage,
  conversationHasCrisisSafetyMode,
  type ChatUiMessage,
} from "@/lib/conversations/chat-history-ui";

const root = process.cwd();
function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("crisis commercial suppression (MAE-P1-01)", () => {
  it("chatResponseSchema accepts optional safetyMode crisis", () => {
    const base = {
      answer: "Resposta segura.",
      biblicalReferences: [],
      interpretationNotice: "Aviso.",
      usage: {
        level: "normal" as const,
        label: "ok",
        inputTokens: 0,
        outputTokens: 0,
      },
      requestId: "11111111-1111-4111-8111-111111111201",
      conversationId: "22222222-2222-4222-8222-222222222201",
      provider: "mock" as const,
    };
    expect(chatResponseSchema.safeParse(base).success).toBe(true);
    expect(
      chatResponseSchema.safeParse({ ...base, safetyMode: "crisis" }).success,
    ).toBe(true);
    expect(
      chatResponseSchema.safeParse({ ...base, safetyMode: "other" }).success,
    ).toBe(false);
  });

  it("conversationHasCrisisSafetyMode uses server marker only", () => {
    const normal: ChatUiMessage[] = [
      { id: "u1", role: "user", content: "Olá" },
      {
        id: "a1",
        role: "assistant",
        content: "Reflexão comum.",
        meta: { interpretationNotice: "Aviso comum." },
      },
    ];
    expect(conversationHasCrisisSafetyMode(normal)).toBe(false);

    const withCrisis = appendAssistantUiMessage(normal, {
      requestId: "11111111-1111-4111-8111-111111111202",
      answer: "Resposta de segurança.",
      safetyMode: "crisis",
    });
    expect(conversationHasCrisisSafetyMode(withCrisis)).toBe(true);

    // Keyword-looking content without marker must not suppress.
    const keywordOnly: ChatUiMessage[] = [
      {
        id: "a2",
        role: "assistant",
        content: "Procure ajuda humana e ligue 188.",
      },
    ];
    expect(conversationHasCrisisSafetyMode(keywordOnly)).toBe(false);
  });

  it("chat-panel suppresses deepen and plan upsells when crisis marker present", () => {
    const panel = readSrc("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("conversationHasCrisisSafetyMode");
    expect(panel).toContain("suppressCommercialPrompts");
    expect(panel).toContain("showDeepenControls");
    expect(panel).toContain("showDeepUpsellHint");
    expect(panel).toContain("safetyMode: payload.safetyMode");
    // Upsell suggestion must bail on crisis context.
    expect(panel).toMatch(
      /if \(conversationHasCrisisSafetyMode\(messages\)\) return null/,
    );
  });

  it("service returns safetyMode crisis and panel does not keyword-detect", () => {
    const service = readSrc("src", "lib", "ai", "chat-service.ts");
    expect(service).toContain('safetyMode: "crisis"');
    const panel = readSrc("src", "components", "chat", "chat-panel.tsx");
    expect(panel).not.toMatch(/detectCrisisMessage/);
    expect(panel).not.toMatch(/me matar|suicíd/i);
  });

  it("remount/new conversation restores commercial UI (no shared crisis flag)", () => {
    const withCrisis = appendAssistantUiMessage([], {
      requestId: "11111111-1111-4111-8111-111111111203",
      answer: "Segurança.",
      safetyMode: "crisis",
    });
    expect(conversationHasCrisisSafetyMode(withCrisis)).toBe(true);
    // Fresh panel state (new conversation / remount) starts empty.
    expect(conversationHasCrisisSafetyMode([])).toBe(false);
  });
});
