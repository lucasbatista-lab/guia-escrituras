import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendAssistantUiMessage,
  assistantMessageId,
  conversationChatPath,
  mapStoredMessagesToUi,
  rollbackOptimisticUserMessage,
  syncConversationUrl,
} from "@/lib/conversations/chat-history-ui";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import {
  resetChatTurnLocksForTests,
} from "@/lib/ai/chat-turn-lock";
import { IDENTITY_DISCLAIMER } from "@/lib/theology";

const root = process.cwd();
const generateSpy = vi.fn();

vi.mock("@/lib/database/repositories", async () => {
  const { createMemoryRepositories } = await import(
    "@/lib/database/repositories/memory"
  );
  return {
    getRepositories: () => createMemoryRepositories(),
  };
});

vi.mock("@/lib/ai/gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gateway")>();
  return {
    ...actual,
    createAiProvider: () => ({
      generate: generateSpy,
    }),
    isOpenAiConfigured: () => false,
  };
});

vi.mock("@/config/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/runtime")>();
  return {
    ...actual,
    requiresRealOpenAiForChat: () => false,
  };
});

const baseAuth = {
  userId: "user-history-rel",
  email: "h@example.com",
  spiritualProfile: {
    traditionKey: "ecumenical" as const,
    denomination: null,
    preferredBibleTranslation: null,
    responseStyle: "reflective" as const,
    preferredDepth: "balanced" as const,
    saintsContentEnabled: false,
    onboardingCompleted: true,
  },
  planKey: "caminho" as const,
  subscriptionStatus: "active",
  subscriptionPeriodEnd: null,
  hasStripeSubscription: true,
  hasDuplicateSubscriptions: false,
  isAdmin: false,
  demoMode: true,
};

describe("chat history UI helpers", () => {
  it("maps stored messages, skips system, restores biblical refs", () => {
    const mapped = mapStoredMessagesToUi([
      {
        id: "u1",
        role: "user",
        content: "Olá",
        biblicalReferences: [],
      },
      {
        id: "sys",
        role: "system",
        content: "interno",
        biblicalReferences: [],
      },
      {
        id: "a1",
        role: "assistant",
        content: "Paz",
        biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
      },
    ]);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({ id: "u1", role: "user" });
    expect(mapped[1]?.meta?.biblicalReferences?.[0]?.book).toBe("João");
  });

  it("dedupes assistant bubbles by requestId", () => {
    const first = appendAssistantUiMessage([], {
      requestId: "req-a",
      answer: "uma",
    });
    const second = appendAssistantUiMessage(first, {
      requestId: "req-a",
      answer: "duas",
    });
    expect(second).toHaveLength(1);
    expect(second[0]?.content).toBe("uma");
    expect(assistantMessageId("req-a")).toBe("req-a-assistant");
  });

  it("rolls back optimistic user bubble for non-retryable errors", () => {
    const prev = [
      { id: "other", role: "user" as const, content: "antes" },
      { id: "req-x", role: "user" as const, content: "nova" },
    ];
    expect(rollbackOptimisticUserMessage(prev, "req-x")).toEqual([
      { id: "other", role: "user", content: "antes" },
    ]);
  });

  it("builds conversation path and syncs URL without remount params", () => {
    expect(conversationChatPath("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(
      "/conversar?c=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    const replaceState = vi.fn();
    const href =
      "https://app.test/conversar?tema=paz&jornada=j1&etapa=e1";
    vi.stubGlobal("window", {
      location: { href },
      history: { state: null, replaceState },
    });
    syncConversationUrl("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(replaceState).toHaveBeenCalledTimes(1);
    const nextUrl = replaceState.mock.calls[0]?.[2] as string;
    expect(nextUrl).toContain("c=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(nextUrl).not.toContain("tema=");
    expect(nextUrl).not.toContain("jornada=");
    expect(nextUrl).not.toContain("etapa=");
    vi.unstubAllGlobals();
  });
});

describe("chat reliability — history contracts in source", () => {
  it("chat panel uses single-flight, URL sync, rollback and assistant dedupe", () => {
    const panel = readFileSync(
      join(root, "src", "components", "chat", "chat-panel.tsx"),
      "utf8",
    );
    expect(panel).toContain("sendingRef");
    expect(panel).toContain("syncConversationUrl");
    expect(panel).toContain("rollbackOptimisticUserMessage");
    expect(panel).toContain("appendAssistantUiMessage");
  });

  it("conversar page maps meta, soft-fails invalid UUID and load errors", () => {
    const page = readFileSync(
      join(root, "src", "app", "(platform)", "conversar", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("mapStoredMessagesToUi");
    expect(page).toContain("link de conversa é inválido");
    expect(page).toContain("Não foi possível carregar esta conversa");
    expect(page).toContain("RefreshPageButton");
  });

  it("documents process-local lock limitation without claiming cross-instance lease", () => {
    const lock = readFileSync(
      join(root, "src", "lib", "ai", "chat-turn-lock.ts"),
      "utf8",
    );
    expect(lock).toContain("Does not coordinate across serverless");
    expect(lock).toContain("DB lease (migration)");
  });
});

describe("chat reliability — idempotent notice is not internal", () => {
  beforeEach(() => {
    resetChatTurnLocksForTests();
    generateSpy.mockReset();
    generateSpy.mockResolvedValue({
      answer: "Resposta salva.",
      biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
      interpretationNotice: IDENTITY_DISCLAIMER,
      followUpQuestion: "Quer continuar?",
      conversationMemory: "Situação: teste.",
      inputTokens: 10,
      outputTokens: 20,
      model: "mock",
      latencyMs: 1,
      provider: "mock" as const,
      groundingProvider: "curated_v1" as const,
      retrievedReferenceIds: ["jo-14-27"],
      groundingCount: 1,
    });
  });

  afterEach(() => {
    resetChatTurnLocksForTests();
  });

  it("idempotent hit returns empty interpretationNotice (no internal leak)", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "16161616-1616-4161-8161-161616161616";
    const auth = { ...baseAuth, userId: "user-idem-notice" };

    const first = await runChatTurn({
      requestId,
      auth,
      body: { message: "paz", personaKey: "jesus", preferDeep: false },
    });
    expect(first.interpretationNotice.length).toBeGreaterThan(0);

    const second = await runChatTurn({
      requestId,
      auth,
      body: {
        message: "paz",
        personaKey: "jesus",
        preferDeep: false,
        conversationId: first.conversationId,
      },
    });
    expect(second.answer).toBe(first.answer);
    expect(second.interpretationNotice).toBe("");
    expect(second.interpretationNotice).not.toMatch(/idempotent/i);
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it("memory repos keep user isolation on conversation load helpers", async () => {
    const repos = createMemoryRepositories();
    const a = await repos.conversations.create({
      userId: "owner-a",
      personaKey: "jesus",
      title: "Privada A",
    });
    await repos.messages.insertUserMessage({
      conversationId: a.id,
      userId: "owner-a",
      content: "segredo",
      requestId: "17171717-1717-4171-8171-171717171717",
    });
    expect(await repos.conversations.getByIdForUser(a.id, "owner-b")).toBeNull();
    expect(await repos.messages.listRecent(a.id, "owner-b", 10)).toEqual([]);
  });
});
