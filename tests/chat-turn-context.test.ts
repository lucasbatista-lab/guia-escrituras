import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import { RECENT_CONTEXT_MESSAGE_LIMIT } from "@/lib/ai/conversation-memory";
import { normalizeAssistantPresentation } from "@/lib/ai/normalize-assistant-presentation";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";
import type { PreferredDepth } from "@/lib/theology";

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

function authFor(
  userId: string,
  preferredDepth: PreferredDepth,
  planKey: "caminho" | "profundo" = "caminho",
) {
  return {
    userId,
    email: `${userId}@example.com`,
    spiritualProfile: {
      traditionKey: "ecumenical" as const,
      denomination: null,
      preferredBibleTranslation: null,
      responseStyle: "reflective" as const,
      preferredDepth,
      saintsContentEnabled: false,
      onboardingCompleted: true,
    },
    planKey,
    subscriptionStatus: "active",
    subscriptionPeriodEnd: null,
    hasStripeSubscription: true,
    hasDuplicateSubscriptions: false,
    isAdmin: false,
    demoMode: true,
  };
}

function mockResult(topic: string, depth: PreferredDepth) {
  return {
    answer: `Reflexão sobre: ${topic}. (profundidade ${depth})`,
    biblicalReferences: [{ book: "Salmos", chapter: 23, verseStart: 1 }],
    interpretationNotice: SHORT_INTERPRETATION_NOTICE,
    followUpQuestion: "Quer aprofundar esse ponto?",
    conversationMemory: `Situação atual: ${topic}. Profundidade: ${depth}.`,
    inputTokens: 100,
    outputTokens: 80,
    model: "mock",
    latencyMs: 1,
    provider: "mock",
    groundingProvider: "curated_v1",
    retrievedReferenceIds: ["sl-23-1"],
    groundingCount: 1,
  };
}

describe("chat turn context alignment", () => {
  beforeEach(() => {
    generateSpy.mockReset();
  });

  it("keeps each of three consecutive turns on the current topic and depth", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const userId = "ctx-three-turns";

    const turns = [
      {
        requestId: "a1111111-1111-4111-8111-111111111101",
        message:
          "Estou ansioso com uma decisão profissional e preciso de direção breve.",
        depth: "brief" as const,
        topicKey: "decisão profissional",
      },
      {
        requestId: "a1111111-1111-4111-8111-111111111102",
        message:
          "Estou tendo dificuldade para perdoar uma pessoa da minha família.",
        depth: "balanced" as const,
        topicKey: "perdoar",
      },
      {
        requestId: "a1111111-1111-4111-8111-111111111103",
        message:
          "Sinto que estou passando por uma fase de silêncio espiritual e falta de sentido.",
        depth: "deep" as const,
        topicKey: "silêncio espiritual",
      },
    ];

    let conversationId: string | undefined;

    for (const turn of turns) {
      generateSpy.mockImplementationOnce(async (input: {
        currentUserMessage: string;
        messages: Array<{ role: string; content: string }>;
        responseDepth?: string;
        conversationSummary?: string | null;
      }) => {
        expect(input.currentUserMessage).toBe(turn.message);
        expect(
          input.messages.some(
            (m) => m.role === "user" && m.content === turn.message,
          ),
        ).toBe(false);
        expect(input.responseDepth).toBe(turn.depth);
        expect(input.messages.length).toBeLessThanOrEqual(
          RECENT_CONTEXT_MESSAGE_LIMIT,
        );
        return mockResult(turn.topicKey, turn.depth);
      });

      const result = await runChatTurn({
        requestId: turn.requestId,
        auth: authFor(
          userId,
          turn.depth,
          turn.depth === "deep" ? "profundo" : "caminho",
        ),
        body: {
          message: turn.message,
          personaKey: "jesus",
          preferDeep: false,
          conversationId,
        },
      });

      conversationId = result.conversationId;
      expect(result.answer).toContain(turn.topicKey);
      expect(result.answer).not.toMatch(/memória da conversa pode atrasar/i);
      expect(result.interpretationNotice).not.toMatch(/persistência|requestId/i);
      expect(generateSpy).toHaveBeenCalledTimes(
        turns.indexOf(turn) + 1,
      );
    }

    // Turn 2 must have seen turn 1 history, turn 3 must have seen prior topics as context only
    const call2 = generateSpy.mock.calls[1]?.[0] as {
      messages: Array<{ content: string }>;
      currentUserMessage: string;
    };
    expect(call2.currentUserMessage).toContain("perdoar");
    expect(call2.messages.some((m) => m.content.includes("profissional"))).toBe(
      true,
    );

    const call3 = generateSpy.mock.calls[2]?.[0] as {
      messages: Array<{ content: string }>;
      currentUserMessage: string;
      conversationSummary?: string | null;
    };
    expect(call3.currentUserMessage).toContain("silêncio espiritual");
    expect(call3.messages.some((m) => m.content.includes("perdoar"))).toBe(true);
    expect(call3.conversationSummary).toBeTruthy();
  });

  it("handles first message with empty prior context", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    generateSpy.mockImplementationOnce(async (input: {
      currentUserMessage: string;
      messages: unknown[];
    }) => {
      expect(input.messages).toEqual([]);
      expect(input.currentUserMessage).toContain("primeira");
      return mockResult("primeira", "balanced");
    });

    await runChatTurn({
      requestId: "b1111111-1111-4111-8111-111111111201",
      auth: authFor("ctx-first", "balanced"),
      body: {
        message: "Esta é minha primeira mensagem de reflexão.",
        personaKey: "jesus",
      },
    });
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it("excludes persisted current message by requestId, even with identical text", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const userId = "ctx-identical";
    const text = "Preciso de paz diante de Deus.";

    generateSpy.mockImplementation(async (input: {
      currentUserMessage: string;
      messages: Array<{ role: string; content: string }>;
    }) => {
      expect(input.currentUserMessage).toBe(text);
      const userDupes = input.messages.filter(
        (m) => m.role === "user" && m.content === text,
      );
      // Prior identical turn may appear once as history; never as "current" duplicate in messages.
      expect(userDupes.length).toBeLessThanOrEqual(1);
      return mockResult("paz", "balanced");
    });

    const first = await runChatTurn({
      requestId: "c1111111-1111-4111-8111-111111111301",
      auth: authFor(userId, "balanced"),
      body: { message: text, personaKey: "jesus" },
    });

    await runChatTurn({
      requestId: "c1111111-1111-4111-8111-111111111302",
      auth: authFor(userId, "balanced"),
      body: {
        message: text,
        personaKey: "jesus",
        conversationId: first.conversationId,
      },
    });

    expect(generateSpy).toHaveBeenCalledTimes(2);
    const second = generateSpy.mock.calls[1]?.[0] as {
      messages: Array<{ role: string; content: string }>;
      currentUserMessage: string;
    };
    expect(second.currentUserMessage).toBe(text);
    expect(
      second.messages.some((m) => m.role === "user" && m.content === text),
    ).toBe(true);
  });

  it("retries reuse assistant without a second model call", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "d1111111-1111-4111-8111-111111111401";
    generateSpy.mockImplementationOnce(async () => mockResult("retry", "brief"));

    const first = await runChatTurn({
      requestId,
      auth: authFor("ctx-retry", "brief"),
      body: { message: "Mensagem para retry", personaKey: "jesus" },
    });

    const second = await runChatTurn({
      requestId,
      auth: authFor("ctx-retry", "brief"),
      body: {
        message: "Mensagem para retry",
        personaKey: "jesus",
        conversationId: first.conversationId,
      },
    });

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(second.answer).toBe(first.answer);
  });

  it("strips duplicated structured fields and technical persist warnings", () => {
    const notice = SHORT_INTERPRETATION_NOTICE;
    const followUp = "Quer trazer mais um detalhe?";
    const refs = [{ book: "João", chapter: 14, verseStart: 27 }];
    const normalized = normalizeAssistantPresentation({
      answer: [
        "Corpo legítimo da reflexão.",
        notice,
        followUp,
        "Referências · João 14:27",
        "(A resposta foi salva; a memória da conversa pode atrasar.)",
      ].join("\n\n"),
      interpretationNotice: `${notice} (A resposta foi salva; a memória da conversa pode atrasar.)`,
      followUpQuestion: followUp,
      biblicalReferences: refs,
    });

    expect(normalized.answer).toContain("Corpo legítimo");
    expect(normalized.answer).not.toContain(notice);
    expect(normalized.answer).not.toContain(followUp);
    expect(normalized.answer).not.toMatch(/memória da conversa pode atrasar/i);
    expect(normalized.interpretationNotice).toBe(notice);
    expect(normalized.followUpQuestion).toBe(followUp);
  });

  it("openai provider prompt uses explicit currentUserMessage as Pergunta atual", async () => {
    const { OpenAiResponsesProvider } = await import(
      "@/lib/ai/openai-provider"
    );
    const { createBiblicalGroundingProvider } = await import("@/lib/biblical");
    const { theologyPolicyResolver } = await import("@/lib/theology");

    const provider = new OpenAiResponsesProvider("sk-test");
    const create = vi.fn().mockResolvedValue({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: "",
      usage: { input_tokens: 1, output_tokens: 0 },
    });
    (
      provider as unknown as {
        client: { responses: { create: typeof create } };
      }
    ).client = { responses: { create } };

    const grounding = createBiblicalGroundingProvider().retrieve({
      question: "silêncio espiritual",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "prompt-check",
      limit: 2,
    });
    const policy = theologyPolicyResolver.resolve({
      traditionKey: "ecumenical",
      personaKey: "jesus",
      userPrefs: {
        responseStyle: "pastoral",
        preferredDepth: "deep",
        saintsContentEnabled: false,
        preferredBibleTranslation: null,
        denomination: null,
      },
    });

    await expect(
      provider.generate({
        messages: [
          { role: "user", content: "dificuldade para perdoar na família" },
          { role: "assistant", content: "resposta anterior sobre perdão" },
        ],
        currentUserMessage:
          "Sinto que estou passando por uma fase de silêncio espiritual.",
        theologyPolicy: policy,
        model: "gpt-5-mini",
        requestId: "e1111111-1111-4111-8111-111111111501",
        grounding,
        conversationSummary: "Antes: perdão familiar.",
        responseDepth: "deep",
      }),
    ).rejects.toThrow();

    const payload = create.mock.calls[0]?.[0] as {
      input: Array<{ role: string; content: string }>;
    };
    const userPrompt = payload.input.find((i) => i.role === "user")?.content ?? "";
    expect(userPrompt).toContain(
      "Pergunta atual (responda a isto):\nSinto que estou passando por uma fase de silêncio espiritual.",
    );
    expect(userPrompt).toContain("dificuldade para perdoar na família");
    // Must not treat prior user message as the current question block alone
    expect(userPrompt).not.toMatch(
      /Pergunta atual \(responda a isto\):\ndificuldade para perdoar/,
    );
  });
});
