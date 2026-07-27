import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  assessDeepAnswerCompleteness,
  assertDeepAnswerSubstantive,
  isDeepAnswerSubstantive,
} from "@/lib/ai/deep-response-completeness";
import { normalizeAssistantPresentation } from "@/lib/ai/normalize-assistant-presentation";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import { resetChatTurnLocksForTests } from "@/lib/ai/chat-turn-lock";

const sharedRepos = createMemoryRepositories();
const generateSpy = vi.fn();

vi.mock("@/lib/database/repositories", () => ({
  getRepositories: () => sharedRepos,
}));

vi.mock("@/lib/ai/gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gateway")>();
  return {
    ...actual,
    createAiProvider: () => ({ generate: generateSpy }),
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

const COMPLETE_DEEP = [
  "Entendo a tensão entre a decisão profissional e o cuidado com a família e a comunidade.",
  "",
  "À luz das Escrituras, vale separar o que é vocação responsável do que é medo de desagradar. A reflexão convida a pedir sabedoria, a ouvir conselheiros de confiança e a não tratar sucesso como idolatria nem família como obstáculo automático.",
  "",
  "Aplicação prática: (1) escrever os valores em jogo sem ranking rígido; (2) conversar com alguém maduro da comunidade; (3) orar pedindo clareza para o próximo passo pequeno, não para o plano inteiro de uma vez.",
].join("\n");

const INTRO_ONLY = [
  "Entendo que essa decisão entre trabalho e família pesa muito agora.",
].join("\n");

function providerShell(answer: string) {
  return {
    answer,
    biblicalReferences: [
      { book: "Provérbios", chapter: 3, verseStart: 5 },
      { book: "Tiago", chapter: 1, verseStart: 5 },
    ],
    interpretationNotice: SHORT_INTERPRETATION_NOTICE,
    followUpQuestion: "Quer continuar explorando esse dilema?",
    conversationMemory: "Situação: decisão profissional versus família.",
    inputTokens: 40,
    outputTokens: 60,
    model: "mock-deep",
    latencyMs: 2,
    provider: "mock" as const,
    groundingProvider: "curated_v1" as const,
    retrievedReferenceIds: ["pv-3-5", "tg-1-5"],
    groundingCount: 2,
  };
}

describe("deep response completeness — structural", () => {
  it("accepts complete deep body", () => {
    expect(isDeepAnswerSubstantive(COMPLETE_DEEP)).toBe(true);
    expect(assessDeepAnswerCompleteness(COMPLETE_DEEP).reason).toBeNull();
  });

  it("rejects intro-only, empty body, and refs-without-content shells", () => {
    expect(isDeepAnswerSubstantive(INTRO_ONLY)).toBe(false);
    expect(assessDeepAnswerCompleteness("").substantive).toBe(false);
    expect(isDeepAnswerSubstantive("Obrigado por compartilhar.")).toBe(false);

    const normalized = normalizeAssistantPresentation({
      answer: INTRO_ONLY,
      interpretationNotice: SHORT_INTERPRETATION_NOTICE,
      followUpQuestion: "Quer continuar?",
      biblicalReferences: [
        { book: "Provérbios", chapter: 3, verseStart: 5 },
      ],
    });
    expect(isDeepAnswerSubstantive(normalized.answer)).toBe(false);
    expect(() => assertDeepAnswerSubstantive(normalized.answer)).toThrow(
      expect.objectContaining({ code: "ai_incomplete", status: 503 }),
    );
  });

  it("standard short answers are not judged by this helper unless preferDeep", () => {
    // Guard is preferDeep-gated in chat-service; helper itself is depth-agnostic.
    expect(isDeepAnswerSubstantive("Paz breve.")).toBe(false);
  });
});

describe("runChatTurn rejects incomplete preferDeep before billing", () => {
  beforeEach(() => {
    generateSpy.mockReset();
    resetChatTurnLocksForTests();
  });

  it("does not persist assistant or consume chat_deep for intro-only deep", async () => {
    generateSpy.mockResolvedValue(providerShell(INTRO_ONLY));
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertAssistant = vi.spyOn(
      sharedRepos.messages,
      "insertAssistantMessage",
    );
    const insertEvent = vi.spyOn(sharedRepos.usage, "insertEvent");

    await expect(
      runChatTurn({
        requestId: "d1111111-1111-4111-8111-111111111201",
        auth: {
          userId: "deep-incomplete-user",
          email: "deep-incomplete@example.com",
          spiritualProfile: {
            traditionKey: "ecumenical" as const,
            denomination: null,
            preferredBibleTranslation: null,
            responseStyle: "reflective" as const,
            preferredDepth: "balanced" as const,
            saintsContentEnabled: false,
            onboardingCompleted: true,
          },
          planKey: "profundo",
          subscriptionStatus: "active",
          subscriptionPeriodEnd: null,
          hasStripeSubscription: true,
          hasDuplicateSubscriptions: false,
          isAdmin: false,
          demoMode: true,
        },
        body: {
          message:
            "Estou em dúvida entre uma promoção profissional e cuidar melhor da família e da comunidade.",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({ code: "ai_incomplete", status: 503 });

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(insertAssistant).not.toHaveBeenCalled();
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("accepts substantive deep and records chat_deep", async () => {
    generateSpy.mockResolvedValue(providerShell(COMPLETE_DEEP));
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertEvent = vi.spyOn(sharedRepos.usage, "insertEvent");

    const result = await runChatTurn({
      requestId: "d1111111-1111-4111-8111-111111111202",
      auth: {
        userId: "deep-complete-user",
        email: "deep-complete@example.com",
        spiritualProfile: {
          traditionKey: "ecumenical" as const,
          denomination: null,
          preferredBibleTranslation: null,
          responseStyle: "reflective" as const,
          preferredDepth: "balanced" as const,
          saintsContentEnabled: false,
          onboardingCompleted: true,
        },
        planKey: "profundo",
        subscriptionStatus: "active",
        subscriptionPeriodEnd: null,
        hasStripeSubscription: true,
        hasDuplicateSubscriptions: false,
        isAdmin: false,
        demoMode: true,
      },
      body: {
        message: "Preciso de reflexão aprofundada sobre perdão e limites.",
        personaKey: "jesus",
        preferDeep: true,
      },
    });

    expect(result.answer).toContain("Aplicação prática");
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ featureType: "chat_deep" }),
    );
  });
});
