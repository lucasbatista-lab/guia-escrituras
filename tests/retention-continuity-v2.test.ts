import { describe, expect, it } from "vitest";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/ai/chat-schema";
import {
  clearComposerDraft,
  composerDraftStorageKey,
  readComposerDraft,
  resolveInitialComposerInput,
  sanitizeComposerDraft,
  writeComposerDraft,
} from "@/lib/conversations/composer-draft";
import {
  resumeReturnCopy,
  resumeReturnTone,
} from "@/lib/conversations/display";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
}

describe("composer draft session helpers", () => {
  it("scopes keys by conversation id and new thread", () => {
    expect(composerDraftStorageKey(null)).toBe("amem:composer-draft:v1:new");
    expect(composerDraftStorageKey("  ")).toBe("amem:composer-draft:v1:new");
    expect(composerDraftStorageKey("abc-123")).toBe(
      "amem:composer-draft:v1:abc-123",
    );
  });

  it("sanitizes control characters and caps length", () => {
    expect(sanitizeComposerDraft("  olá\u0000 mundo  ")).toBe("olá mundo  ");
    const long = "a".repeat(MAX_CHAT_MESSAGE_LENGTH + 40);
    expect(sanitizeComposerDraft(long).length).toBe(MAX_CHAT_MESSAGE_LENGTH);
  });

  it("reads and writes drafts without throwing when storage is missing", () => {
    const store = memoryStorage();
    writeComposerDraft(null, "rascunho local", store);
    expect(readComposerDraft(null, store)).toBe("rascunho local");
    writeComposerDraft(null, "   ", store);
    expect(readComposerDraft(null, store)).toBe("");
    expect(readComposerDraft(null, null)).toBe("");
  });

  it("clears both conversation and new keys after send", () => {
    const store = memoryStorage();
    writeComposerDraft(null, "novo", store);
    writeComposerDraft("c1", "existente", store);
    clearComposerDraft("c1", store);
    expect(readComposerDraft(null, store)).toBe("");
    expect(readComposerDraft("c1", store)).toBe("");
  });

  it("prefers URL/tema draft over session draft", () => {
    const store = memoryStorage();
    writeComposerDraft(null, "session", store);
    expect(
      resolveInitialComposerInput({
        urlDraft: "tema da url",
        conversationId: null,
        storage: store,
      }),
    ).toBe("tema da url");
    expect(
      resolveInitialComposerInput({
        urlDraft: "  ",
        conversationId: null,
        storage: store,
      }),
    ).toBe("session");
  });
});

describe("resume return tone (retention after days)", () => {
  const now = new Date("2026-07-21T15:00:00.000Z");

  it("classifies recent, few_days, and returning without spiritual inference", () => {
    expect(
      resumeReturnTone(new Date(now.getTime() - 2 * 86_400_000).toISOString(), now),
    ).toBe("recent");
    expect(
      resumeReturnTone(new Date(now.getTime() - 5 * 86_400_000).toISOString(), now),
    ).toBe("few_days");
    expect(
      resumeReturnTone(
        new Date(now.getTime() - 20 * 86_400_000).toISOString(),
        now,
      ),
    ).toBe("returning");
  });

  it("keeps copy factual and free of guilt or spiritual pressure", () => {
    for (const tone of ["recent", "few_days", "returning"] as const) {
      const copy = resumeReturnCopy(tone);
      const blob = `${copy.eyebrow} ${copy.title} ${copy.body} ${copy.cta}`.toLowerCase();
      expect(blob).not.toMatch(/pecado|culpa|deus exige|obrigad|milagre/);
      expect(copy.cta.length).toBeGreaterThan(0);
    }
    expect(resumeReturnCopy("returning").title).toContain("histórico");
  });
});

describe("retention V2 wiring", () => {
  it("chat panel persists composer draft and clears on success", () => {
    const chat = readFileSync(
      join(process.cwd(), "src/components/chat/chat-panel.tsx"),
      "utf8",
    );
    expect(chat).toContain("resolveInitialComposerInput");
    expect(chat).toContain("writeComposerDraft");
    expect(chat).toContain("clearComposerDraft");
  });

  it("inicio resume uses age-based return copy", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(platform)/inicio/page.tsx"),
      "utf8",
    );
    expect(page).toContain("resumeReturnTone");
    expect(page).toContain("resumeReturnCopy");
    expect(page).toContain("returnCopy.title");
  });
});
