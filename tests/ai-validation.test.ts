import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  parseAndValidateAiProviderContent,
  assertSafeAiIdentity,
  MAX_AI_ANSWER_LENGTH,
} from "@/lib/ai/provider-output";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { AppError } from "@/lib/safety";
import { IDENTITY_DISCLAIMER } from "@/lib/theology";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";

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

describe("parseAndValidateAiProviderContent", () => {
  it("accepts valid output", () => {
    const content = parseAndValidateAiProviderContent(
      JSON.stringify({
        answer: "Uma reflexão serena.",
        biblicalReferences: [
          { book: "Mateus", chapter: 5, verseStart: 9, verseEnd: null },
        ],
        interpretationNotice: IDENTITY_DISCLAIMER,
        followUpQuestion: null,
        conversationMemory: "Situação: busca de paz. Ponto aberto: detalhes.",
      }),
    );
    expect(content.answer).toContain("reflexão");
    expect(content.biblicalReferences).toHaveLength(1);
    expect(content.interpretationNotice).toBeTruthy();
    expect(content.conversationMemory).toContain("paz");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseAndValidateAiProviderContent("not-json")).toThrow(AppError);
  });

  it("rejects missing answer", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          biblicalReferences: [],
          interpretationNotice: IDENTITY_DISCLAIMER,
          conversationMemory: "x",
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects missing interpretationNotice", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          answer: "ok",
          biblicalReferences: [],
          conversationMemory: "x",
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects missing biblicalReferences", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          answer: "ok",
          interpretationNotice: IDENTITY_DISCLAIMER,
          conversationMemory: "x",
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects excessively long answer", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          answer: "a".repeat(MAX_AI_ANSWER_LENGTH + 1),
          biblicalReferences: [],
          interpretationNotice: IDENTITY_DISCLAIMER,
          conversationMemory: "x",
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects unknown top-level fields via strict schema", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          answer: "ok",
          biblicalReferences: [],
          interpretationNotice: IDENTITY_DISCLAIMER,
          followUpQuestion: null,
          conversationMemory: "memória curta",
          secretCost: 99,
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects missing conversationMemory", () => {
    expect(() =>
      parseAndValidateAiProviderContent(
        JSON.stringify({
          answer: "ok",
          biblicalReferences: [],
          interpretationNotice: IDENTITY_DISCLAIMER,
          followUpQuestion: null,
        }),
      ),
    ).toThrow(AppError);
  });
});

describe("AI identity regression", () => {
  it("rejects claims of being literally Jesus", () => {
    expect(() =>
      assertSafeAiIdentity({
        answer: "Eu sou Jesus e vim falar com você.",
        biblicalReferences: [],
        interpretationNotice: IDENTITY_DISCLAIMER,
        conversationMemory: "x",
      }),
    ).toThrow(AppError);
  });

  it("rejects supernatural revelation claims", () => {
    expect(() =>
      assertSafeAiIdentity({
        answer: "Esta é uma revelação sobrenatural para você.",
        biblicalReferences: [],
        interpretationNotice: IDENTITY_DISCLAIMER,
        conversationMemory: "x",
      }),
    ).toThrow(AppError);
  });

  it("keeps interpretation notice on valid content", () => {
    const content = parseAndValidateAiProviderContent(
      JSON.stringify({
        answer: "Uma orientação baseada nas Escrituras.",
        biblicalReferences: [],
        interpretationNotice: IDENTITY_DISCLAIMER,
        followUpQuestion: null,
        conversationMemory: "Situação: orientação bíblica.",
      }),
    );
    expect(content.interpretationNotice).toContain("inteligência artificial");
  });
});

describe("chat requestId retries", () => {
  it("accepts client UUID requestId", () => {
    const parsed = chatRequestSchema.safeParse({
      message: "Olá",
      requestId: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.requestId).toBe("11111111-1111-4111-8111-111111111111");
    }
  });

  it("rejects invalid requestId", () => {
    const parsed = chatRequestSchema.safeParse({
      message: "Olá",
      requestId: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("runChatTurn requestId idempotency", () => {
  const requestId = "22222222-2222-4222-8222-222222222222";
  const auth = {
    userId: "user-retry-tests",
    email: "u@example.com",
    spiritualProfile: {
      traditionKey: "ecumenical" as const,
      denomination: null,
      preferredBibleTranslation: null,
      responseStyle: "reflective" as const,
      preferredDepth: "balanced" as const,
      saintsContentEnabled: false,
      onboardingCompleted: true,
    },
    planKey: "profundo" as const,
    subscriptionStatus: "active",
    subscriptionPeriodEnd: null,
    hasStripeSubscription: true,
    hasDuplicateSubscriptions: false,
    isAdmin: false,
    demoMode: true,
  };

  beforeEach(() => {
    generateSpy.mockReset();
    generateSpy.mockResolvedValue({
      answer: "Resposta mock determinística.",
      biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
      interpretationNotice: IDENTITY_DISCLAIMER,
      followUpQuestion: "Quer aprofundar?",
      conversationMemory:
        "Situação: busca de paz. Orientação: acolhimento. Ponto aberto: detalhes.",
      inputTokens: 10,
      outputTokens: 20,
      model: "mock",
      latencyMs: 1,
      provider: "mock",
      groundingProvider: "curated_v1",
      retrievedReferenceIds: ["jo-14-27"],
      groundingCount: 1,
    });
  });

  it("reuses assistant response on retry with same requestId", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const first = await runChatTurn({
      requestId,
      auth,
      body: {
        message: "Preciso de paz",
        personaKey: "jesus",
        preferDeep: false,
      },
    });
    expect(first.answer).toContain("mock determinística");
    expect(generateSpy).toHaveBeenCalledTimes(1);

    const second = await runChatTurn({
      requestId,
      auth,
      body: {
        message: "Preciso de paz",
        personaKey: "jesus",
        preferDeep: false,
        conversationId: first.conversationId,
      },
    });
    expect(second.answer).toBe(first.answer);
    expect(second.interpretationNotice).toContain("idempotente");
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate user message for same requestId", async () => {
    const repos = createMemoryRepositories();
    const uniqueId = "33333333-3333-4333-8333-333333333333";
    const { runChatTurn } = await import("@/lib/ai/chat-service");

    generateSpy.mockRejectedValueOnce(new Error("simulated failure"));

    await expect(
      runChatTurn({
        requestId: uniqueId,
        auth: { ...auth, userId: "user-no-dup" },
        body: {
          message: "Mensagem única",
          personaKey: "jesus",
          preferDeep: false,
        },
      }),
    ).rejects.toThrow(AppError);

    generateSpy.mockResolvedValueOnce({
      answer: "Segunda tentativa ok.",
      biblicalReferences: [],
      interpretationNotice: IDENTITY_DISCLAIMER,
      conversationMemory: "Situação: mensagem única após retry.",
      inputTokens: 1,
      outputTokens: 1,
      model: "mock",
      latencyMs: 1,
      provider: "mock",
      groundingProvider: "curated_v1",
      retrievedReferenceIds: [],
      groundingCount: 0,
    });

    const result = await runChatTurn({
      requestId: uniqueId,
      auth: { ...auth, userId: "user-no-dup" },
      body: {
        message: "Mensagem única",
        personaKey: "jesus",
        preferDeep: false,
      },
    });

    expect(result.answer).toContain("Segunda tentativa");
    const userMsg = await repos.messages.findByRequestId(
      "user-no-dup",
      uniqueId,
      "user",
    );
    expect(userMsg).not.toBeNull();
    expect(userMsg?.content).toBe("Mensagem única");

    // Across all conversations, only one user row for this requestId.
    let userCount = 0;
    for (const conv of await repos.conversations.listForUser("user-no-dup", 50)) {
      const recent = await repos.messages.listRecent(conv.id, "user-no-dup", 50);
      userCount += recent.filter(
        (m) => m.role === "user" && m.requestId === uniqueId,
      ).length;
    }
    expect(userCount).toBe(1);
  });

  it("passes curated grounding into the AI provider", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await runChatTurn({
      requestId: "44444444-4444-4444-8444-444444444444",
      auth: { ...auth, userId: "user-grounding" },
      body: {
        message: "Estou ansioso e preciso de orientação.",
        personaKey: "jesus",
        preferDeep: false,
      },
    });
    expect(generateSpy).toHaveBeenCalled();
    const arg = generateSpy.mock.calls[0]?.[0] as {
      grounding?: { groundingProvider: string; groundingCount: number };
    };
    expect(arg.grounding?.groundingProvider).toBe("curated_v1");
    expect(arg.grounding?.groundingCount).toBeGreaterThanOrEqual(3);
  });
});
