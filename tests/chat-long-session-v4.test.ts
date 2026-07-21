import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveChatClientError } from "@/lib/ai/chat-client-errors";
import {
  CHAT_THREAD_LOAD_LIMIT,
  chatThreadMayBeTruncated,
} from "@/lib/conversations/chat-thread-window";

describe("chat long-session reliability", () => {
  it("maps conversation_not_found to an actionable not_found view", () => {
    const view = resolveChatClientError({
      status: 404,
      code: "conversation_not_found",
    });
    expect(view.kind).toBe("not_found");
    expect(view.keepPendingRequest).toBe(false);
    expect(view.message.toLowerCase()).toMatch(/conversa|hist[oó]rico|nova/);
  });

  it("treats a full load page as possibly truncated", () => {
    expect(CHAT_THREAD_LOAD_LIMIT).toBe(200);
    expect(chatThreadMayBeTruncated(199)).toBe(false);
    expect(chatThreadMayBeTruncated(200)).toBe(true);
    expect(chatThreadMayBeTruncated(200, 100)).toBe(true);
  });

  it("conversar loads with explicit limit and truncation flag", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(platform)/conversar/page.tsx"),
      "utf8",
    );
    expect(page).toContain("CHAT_THREAD_LOAD_LIMIT");
    expect(page).toContain("historyMayBeTruncated");
    expect(page).not.toMatch(/listRecent\([^)]*,\s*200\s*\)/);
  });

  it("chat panel supports cancel in-flight and truncation notice", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/chat/chat-panel.tsx"),
      "utf8",
    );
    expect(panel).toContain("cancelInFlightSend");
    expect(panel).toContain("Cancelar");
    expect(panel).toContain("historyMayBeTruncated");
    expect(panel).toContain("mensagens mais recentes");
    expect(panel).toContain('errorKind === "not_found"');
  });
});
