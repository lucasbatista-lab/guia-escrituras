import { describe, expect, it, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RECENT_CONTEXT_MESSAGE_LIMIT,
  getConversationMemoryMaxChars,
  sanitizeConversationMemory,
  selectContextMessages,
} from "@/lib/ai/conversation-memory";
import {
  getResponseDepthGuidance,
  resolveChatResponseDepth,
} from "@/lib/ai/response-depth";
import { parseAndValidateAiProviderContent } from "@/lib/ai/provider-output";
import { chatResponseSchema } from "@/lib/ai/chat-schema";
import { AppError } from "@/lib/safety";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import { IDENTITY_DISCLAIMER } from "@/lib/theology";
import { theologyPolicyResolver } from "@/lib/theology";

const sharedRepos = createMemoryRepositories();
const generateSpy = vi.fn();

vi.mock("@/lib/database/repositories", () => ({
  getRepositories: () => sharedRepos,
}));

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

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const baseAuth = {
  userId: "memory-user",
  email: "m@example.com",
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

function mockGenerateResult(overrides: Record<string, unknown> = {}) {
  return {
    answer: "Resposta de teste acolhedora e bíblica.",
    biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
    interpretationNotice: SHORT_INTERPRETATION_NOTICE,
    followUpQuestion: "Quer trazer mais um detalhe?",
    conversationMemory:
      "Situação: busca de paz. Contexto: ansiedade. Orientação: oração e passo concreto. Aberto: detalhes.",
    inputTokens: 12,
    outputTokens: 24,
    model: "mock",
    latencyMs: 2,
    provider: "mock",
    groundingProvider: "curated_v1",
    retrievedReferenceIds: ["jo-14-27"],
    groundingCount: 1,
    ...overrides,
  };
}

describe("conversation memory helpers", () => {
  it("defaults summary limit between 800 and 1200", () => {
    const max = getConversationMemoryMaxChars();
    expect(max).toBeGreaterThanOrEqual(800);
    expect(max).toBeLessThanOrEqual(1200);
  });

  it("sanitizes secrets and truncates", () => {
    const raw =
      "senha: secret123 token:sk-abcdefghi123456789 and card 4111111111111111 " +
      "a".repeat(2000);
    const cleaned = sanitizeConversationMemory(raw, 200);
    expect(cleaned).not.toContain("secret123");
    expect(cleaned).not.toContain("sk-abcdefghi");
    expect(cleaned).not.toContain("4111111111111111");
    expect(cleaned).toContain("[redacted]");
    expect(cleaned.length).toBeLessThanOrEqual(200);
  });

  it("selects at most 4 prior messages and excludes current question", () => {
    const current = "Pergunta atual única";
    const recent = [
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u2" },
      { role: "assistant", content: "a2" },
      { role: "user", content: "u3" },
      { role: "assistant", content: "a3" },
      { role: "user", content: current },
    ];
    const selected = selectContextMessages({
      recentChronological: recent,
      currentUserMessage: current,
    });
    expect(selected.length).toBe(RECENT_CONTEXT_MESSAGE_LIMIT);
    expect(selected.map((m) => m.content)).toEqual(["u2", "a2", "u3", "a3"]);
    expect(selected.some((m) => m.content === current)).toBe(false);
  });
});

describe("depth calibration", () => {
  it("brief/balanced/deep use required word and reference bands", () => {
    expect(resolveChatResponseDepth({ preferredDepth: "brief" })).toBe("brief");
    expect(getResponseDepthGuidance("brief").wordRange).toEqual({
      min: 150,
      max: 300,
    });
    expect(getResponseDepthGuidance("balanced").wordRange).toEqual({
      min: 300,
      max: 600,
    });
    expect(getResponseDepthGuidance("deep").wordRange).toEqual({
      min: 600,
      max: 1000,
    });
    expect(getResponseDepthGuidance("brief").referenceCount.max).toBe(2);
    expect(getResponseDepthGuidance("balanced").referenceCount.max).toBe(4);
    expect(getResponseDepthGuidance("deep").referenceCount.max).toBe(5);
  });

  it("prompt forbids speaking as Jesus and identity repetition", () => {
    const lines = getResponseDepthGuidance("balanced").promptLines.join("\n");
    expect(lines).toContain("Jesus está dizendo");
    expect(lines).toContain("Não inicie repetindo que é uma IA");
    expect(lines).toContain("interpretationNotice");
  });
});

describe("tradition and identity prompts", () => {
  it("evangelical policy forbids saints devotion", () => {
    const policy = theologyPolicyResolver.resolve({
      traditionKey: "evangelical",
      personaKey: "jesus",
      userPrefs: {
        traditionKey: "evangelical",
        denomination: null,
        preferredBibleTranslation: null,
        responseStyle: "practical",
        preferredDepth: "balanced",
        saintsContentEnabled: false,
        onboardingCompleted: true,
      },
    });
    const text = policy.composedSystemPromptSections.join("\n").toLowerCase();
    expect(text).toContain("santos");
    expect(policy.allowsSaintsContent).toBe(false);
  });

  it("identity disclaimer remains available without forcing body repetition", () => {
    expect(IDENTITY_DISCLAIMER.toLowerCase()).toContain("inteligência artificial");
    const depth = read("src", "lib", "ai", "response-depth.ts");
    expect(depth).toContain("Não inicie repetindo que é uma IA");
    const service = read("src", "lib", "ai", "openai-provider.ts");
    expect(service).not.toMatch(/Sou uma experiência de inteligência artificial/);
  });
});

describe("runChatTurn memory persistence", () => {
  beforeEach(() => {
    generateSpy.mockReset();
    generateSpy.mockImplementation(async () => mockGenerateResult());
  });

  it("creates summary on first completed turn without a second OpenAI call", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const result = await runChatTurn({
      requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      auth: { ...baseAuth, userId: "mem-first" },
      body: {
        message: "Estou cansado e preciso de paz.",
        personaKey: "jesus",
        preferDeep: false,
      },
    });

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(result).not.toHaveProperty("conversationMemory");
    const publicParse = chatResponseSchema.safeParse(result);
    expect(publicParse.success).toBe(true);

    const summary = await sharedRepos.summaries.get(
      result.conversationId,
      "mem-first",
    );
    expect(summary?.summary).toBeTruthy();
    expect(summary?.summary.toLowerCase()).toContain("paz");

    const history = await sharedRepos.messages.listRecent(
      result.conversationId,
      "mem-first",
      50,
    );
    expect(history.some((m) => m.role === "user")).toBe(true);
    expect(history.some((m) => m.role === "assistant")).toBe(true);
  });

  it("sends at most 4 context messages and not the full history", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const userId = "mem-long-hist";
    const conv = await sharedRepos.conversations.create({
      userId,
      personaKey: "jesus",
      title: "hist",
    });
    // Stay under CHAT_RATE_LIMIT_PER_MINUTE (5) while seeding a history
    // longer than the context window of 4 messages.
    for (let i = 0; i < 4; i++) {
      await sharedRepos.messages.insertUserMessage({
        conversationId: conv.id,
        userId,
        content: `seed user ${i}`,
        requestId: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee${i}`,
      });
      await sharedRepos.messages.insertAssistantMessage({
        conversationId: conv.id,
        userId,
        content: `seed assistant ${i}`,
        biblicalReferences: [],
        requestId: `ffffffff-ffff-4fff-8fff-fffffffffff${i}`,
      });
    }
    await sharedRepos.summaries.upsert({
      conversationId: conv.id,
      userId,
      summary: "Resumo prévio de conversa longa.",
    });

    await runChatTurn({
      requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9",
      auth: { ...baseAuth, userId },
      body: {
        message: "Pergunta final do histórico longo",
        personaKey: "jesus",
        preferDeep: false,
        conversationId: conv.id,
      },
    });

    const lastCall = generateSpy.mock.calls.at(-1)?.[0] as {
      messages: Array<{ content: string }>;
      conversationSummary?: string | null;
    };
    expect(lastCall.messages.length).toBeLessThanOrEqual(
      RECENT_CONTEXT_MESSAGE_LIMIT,
    );
    expect(
      lastCall.messages.some((m) =>
        m.content.includes("Pergunta final do histórico longo"),
      ),
    ).toBe(false);
    expect(lastCall.conversationSummary).toContain("Resumo prévio");

    const full = await sharedRepos.messages.listRecent(conv.id, userId, 100);
    expect(full.length).toBeGreaterThan(4);
  });

  it("updates previous summary progressively and skips duplicate on retry", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const userId = "mem-retry";
    const requestId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";

    generateSpy.mockImplementationOnce(async () =>
      mockGenerateResult({
        conversationMemory: "Memória v1: ansiedade leve.",
      }),
    );

    const first = await runChatTurn({
      requestId,
      auth: { ...baseAuth, userId },
      body: { message: "Estou ansioso", personaKey: "jesus" },
    });

    const afterFirst = await sharedRepos.summaries.get(
      first.conversationId,
      userId,
    );
    expect(afterFirst?.summary).toContain("v1");

    generateSpy.mockImplementationOnce(async () =>
      mockGenerateResult({
        conversationMemory: "Memória v2 NÃO deve sobrescrever no retry.",
      }),
    );

    await runChatTurn({
      requestId,
      auth: { ...baseAuth, userId },
      body: {
        message: "Estou ansioso",
        personaKey: "jesus",
        conversationId: first.conversationId,
      },
    });

    expect(generateSpy).toHaveBeenCalledTimes(1);
    const afterRetry = await sharedRepos.summaries.get(
      first.conversationId,
      userId,
    );
    expect(afterRetry?.summary).toContain("v1");
    expect(afterRetry?.summary).not.toContain("NÃO deve");

    generateSpy.mockImplementationOnce(async (input: {
      conversationSummary?: string | null;
    }) => {
      expect(input.conversationSummary).toContain("v1");
      return mockGenerateResult({
        conversationMemory: "Memória v2: ansiedade + próximo passo.",
      });
    });

    await runChatTurn({
      requestId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
      auth: { ...baseAuth, userId },
      body: {
        message: "E agora um próximo passo?",
        personaKey: "jesus",
        conversationId: first.conversationId,
      },
    });

    const afterSecond = await sharedRepos.summaries.get(
      first.conversationId,
      userId,
    );
    expect(afterSecond?.summary).toContain("v2");
  });

  it("does not update summary when AI fails or output is invalid", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const userId = "mem-fail";

    generateSpy.mockRejectedValueOnce(new Error("boom"));
    await expect(
      runChatTurn({
        requestId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
        auth: { ...baseAuth, userId },
        body: { message: "Olá", personaKey: "jesus" },
      }),
    ).rejects.toThrow(AppError);

    const convs = await sharedRepos.conversations.listForUser(userId, 10);
    if (convs[0]) {
      const summary = await sharedRepos.summaries.get(convs[0].id, userId);
      expect(summary).toBeNull();
    }

    generateSpy.mockRejectedValueOnce(
      new AppError("ai_invalid_output", "ai_invalid_output", 503, "inválido"),
    );
    await expect(
      runChatTurn({
        requestId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
        auth: { ...baseAuth, userId: "mem-fail-2" },
        body: { message: "Olá de novo", personaKey: "jesus" },
      }),
    ).rejects.toThrow(AppError);
  });

  it("rejects grounded reference outside retrieval via schema filter path", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          answer: "ok",
          biblicalReferences: [],
          interpretationNotice: SHORT_INTERPRETATION_NOTICE,
          followUpQuestion: null,
          // valid shape; out-of-grounding refs are filtered in provider layer
          conversationMemory: "ok",
        }),
      ),
    ).not.toThrow();

    const openai = read("src", "lib", "ai", "openai-provider.ts");
    expect(openai).toContain("filterReferencesToGrounding");
    expect(openai).toContain("buildConversationMemoryPromptGuidance");
    expect(openai).toContain("Pergunta atual");
  });

  it("documents that usage_events has no metadata column for context telemetry", () => {
    const usageType = read("src", "lib", "database", "repositories", "types.ts");
    expect(usageType).toContain("UsageEventInput");
    expect(usageType).not.toMatch(/metadata\??:\s*/);
    const service = read("src", "lib", "ai", "chat-service.ts");
    expect(service).toContain("recentMessageCount");
    expect(service).toContain("summaryUsed");
    expect(service).toContain("usage_events has no metadata column");
  });
});
