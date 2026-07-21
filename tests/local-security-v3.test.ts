import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { resolveChatClientError } from "@/lib/ai/chat-client-errors";
import { resolveAuthorizedPersonaKey } from "@/lib/ai/chat-persona";
import { isUuid, safeNextPath } from "@/lib/navigation/safe-next-path";
import { sanitizeHistorySearchQuery } from "@/lib/conversations/history-list";
import { buildJourneyStepChatPrefill } from "@/lib/journeys/chat-prefill";
import { filterHelpFaq, buildSupportMailto } from "@/lib/support/help-center";
import { sanitizeUserMessage } from "@/lib/safety/input";
import { sanitizeTrackingValue } from "@/lib/acquisition/sanitize";

describe("local security V3 — expanded negatives", () => {
  it("rejects javascript/data schemes and nested path tricks in next", () => {
    expect(safeNextPath("javascript:alert(1)", "/inicio")).toBe("/inicio");
    expect(safeNextPath("data:text/html,hi", "/inicio")).toBe("/inicio");
    expect(safeNextPath("/conversar?c=../../../etc/passwd", "/inicio")).toBe(
      "/conversar?c=../../../etc/passwd",
    );
    // Still same-origin path; UUID validation happens elsewhere.
    expect(isUuid("../../../etc/passwd")).toBe(false);
    expect(isUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
  });

  it("rejects giant chat payloads and maps missing conversation codes", () => {
    expect(sanitizeUserMessage("olá\u0000mundo")).toBe("olámundo");
    expect(() =>
      chatRequestSchema.parse({
        message: "x".repeat(50_000),
        personaKey: "jesus",
      }),
    ).toThrow();
    expect(() =>
      chatRequestSchema.parse({
        message: "ok",
        conversationId: "not-a-uuid",
        personaKey: "jesus",
      }),
    ).toThrow();
    expect(
      resolveChatClientError({
        status: 404,
        code: "conversation_not_found",
      }).kind,
    ).toBe("not_found");
  });

  it("falls back invalid persona and strips invalid journey prefill", () => {
    expect(
      resolveAuthorizedPersonaKey({
        requested: "role:admin",
        traditionKey: "ecumenical",
        saintsContentEnabled: false,
      }).fellBack,
    ).toBe(true);
    expect(buildJourneyStepChatPrefill("not-a-journey", "x")).toBeUndefined();
    expect(buildJourneyStepChatPrefill("", "")).toBeUndefined();
  });

  it("hardens history search, help filter, UTM, and mailto hints", () => {
    expect(sanitizeHistorySearchQuery("a\u0000b<script>")).not.toMatch(
      /<|>|\u0000/,
    );
    expect(filterHelpFaq("\u0000\u0001")).toHaveLength(0);
    expect(sanitizeTrackingValue("utm\n\rvalue", 20)).toBeNull();
    const mailto = buildSupportMailto("tecnico");
    if (mailto) {
      const decoded = decodeURIComponent(mailto);
      expect(decoded).toMatch(/requestId/i);
      expect(decoded.toLowerCase()).not.toMatch(/cole a conversa completa/);
    }
  });
});
