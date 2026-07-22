import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildCrisisAnswer,
  CRISIS_INTERPRETATION_NOTICE,
  CRISIS_RESOURCES_BR,
  detectCrisisMessage,
  normalizeCrisisText,
} from "@/lib/safety/crisis";
import { detectCrisisSupportPresent } from "@/lib/evals/theology/detectors/secrets-crisis";
import { resetChatTurnLocksForTests } from "@/lib/ai/chat-turn-lock";
import { IDENTITY_DISCLAIMER } from "@/lib/theology";

const generateSpy = vi.fn();

vi.mock("@/lib/database/repositories", async () => {
  const { createMemoryRepositories } = await import(
    "@/lib/database/repositories/memory"
  );
  const repos = createMemoryRepositories();
  return {
    getRepositories: () => repos,
  };
});

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

const baseAuth = {
  userId: "user-crisis-test",
  email: "crisis@amemchat.test",
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

describe("crisis detect — português", () => {
  it("normalizes accents", () => {
    expect(normalizeCrisisText("Suicídio")).toContain("suicid");
  });

  it("matches suicide and self-harm signals", () => {
    expect(detectCrisisMessage("Estou pensando em me matar.").matched).toBe(
      true,
    );
    expect(
      detectCrisisMessage("Estou pensando em me machucar e não vejo saída.")
        .matched,
    ).toBe(true);
    expect(
      detectCrisisMessage("Estou há semanas sem vontade de viver o dia.")
        .category,
    ).toBe("suicide");
  });

  it("matches violence and abuse", () => {
    expect(detectCrisisMessage("Vou matar ele hoje à noite.").category).toBe(
      "violence",
    );
    expect(
      detectCrisisMessage("Estou sofrendo violência doméstica agora.").category,
    ).toBe("abuse");
  });

  it("matches medical emergency and acute panic", () => {
    expect(detectCrisisMessage("Acho que estou tendo um infarto.").category).toBe(
      "medical_emergency",
    );
    expect(
      detectCrisisMessage("Estou em crise de pânico agora e não passa.").matched,
    ).toBe(true);
  });

  it("avoids false positives for ordinary pastoral chat", () => {
    const negatives = [
      "Estou com ansiedade forte e o coração dispara.",
      "Perdi alguém que amo e não sei como continuar.",
      "Sinto que Deus me abandonou.",
      "Vou matar a saudade da minha família.",
      "Estou morrendo de vergonha pelo erro.",
      "Quero uma reflexão sobre Salmos 23.",
    ];
    for (const msg of negatives) {
      expect(detectCrisisMessage(msg).matched, msg).toBe(false);
    }
  });
});

describe("crisis response content", () => {
  it("is human, non-divine, and includes BR resources", () => {
    const answer = buildCrisisAnswer("suicide");
    expect(answer).not.toMatch(/eu sou jesus|eu sou deus|revelação/i);
    expect(answer).toMatch(/não sou jesus/i);
    expect(answer).toContain("188");
    expect(answer).toContain("192");
    expect(CRISIS_RESOURCES_BR.locale).toBe("pt-BR");
    expect(detectCrisisSupportPresent(answer)).toBe(true);
    expect(CRISIS_INTERPRETATION_NOTICE).toMatch(/sem modelo de IA/i);
  });
});

describe("crisis intercept in runChatTurn", () => {
  beforeEach(() => {
    generateSpy.mockReset();
    generateSpy.mockResolvedValue({
      answer: "Não deveria aparecer.",
      biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
      interpretationNotice: IDENTITY_DISCLAIMER,
      followUpQuestion: undefined,
      conversationMemory: "",
      inputTokens: 10,
      outputTokens: 20,
      model: "mock",
      latencyMs: 1,
      provider: "mock" as const,
      groundingProvider: "curated_v1" as const,
      retrievedReferenceIds: ["jo-14-27"],
      groundingCount: 1,
    });
    resetChatTurnLocksForTests();
  });

  afterEach(() => {
    resetChatTurnLocksForTests();
  });

  it("returns safety reply without calling the AI provider", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const result = await runChatTurn({
      requestId: "11111111-1111-4111-8111-111111111101",
      auth: baseAuth,
      body: {
        message: "Estou pensando em me machucar e não vejo saída.",
        personaKey: "jesus",
        preferDeep: false,
      },
    });

    expect(generateSpy).not.toHaveBeenCalled();
    expect(result.provider).toBe("mock");
    expect(result.biblicalReferences).toEqual([]);
    expect(result.interpretationNotice).toBe(CRISIS_INTERPRETATION_NOTICE);
    expect(result.safetyMode).toBe("crisis");
    expect(detectCrisisSupportPresent(result.answer)).toBe(true);
    expect(result.answer).not.toMatch(/eu sou jesus/i);
  });

  it("does not intercept ordinary anxiety", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const result = await runChatTurn({
      requestId: "11111111-1111-4111-8111-111111111102",
      auth: baseAuth,
      body: {
        message: "Estou com ansiedade forte e o coração dispara.",
        personaKey: "jesus",
        preferDeep: false,
      },
    });
    expect(generateSpy).toHaveBeenCalled();
    expect(result.safetyMode).toBeUndefined();
  });
});
