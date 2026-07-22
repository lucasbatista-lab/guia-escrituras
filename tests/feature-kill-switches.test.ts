import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FEATURE_TEMPORARILY_DISABLED_CODE,
  isFeatureDisabled,
  KILL_SWITCH_ENV_KEYS,
} from "@/config/feature-kill-switches";
import { resolveChatClientError } from "@/lib/ai/chat-client-errors";
import { isStableChatErrorCode } from "@/lib/observability/stable-error-codes";
import { resetChatTurnLocksForTests } from "@/lib/ai/chat-turn-lock";

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
  userId: "user-kill-switch-test",
  email: "kill@amemchat.test",
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

describe("feature kill switches (MAE-P2-07)", () => {
  afterEach(() => {
    delete process.env[KILL_SWITCH_ENV_KEYS.chat];
    delete process.env[KILL_SWITCH_ENV_KEYS.journeys];
    delete process.env[KILL_SWITCH_ENV_KEYS.deepen];
    resetChatTurnLocksForTests();
    generateSpy.mockReset();
  });

  it("defaults to enabled when env unset", () => {
    expect(isFeatureDisabled("chat", {})).toBe(false);
    expect(isFeatureDisabled("journeys", {})).toBe(false);
    expect(isFeatureDisabled("deepen", {})).toBe(false);
  });

  it("parses true/false and fails closed on invalid values", () => {
    expect(isFeatureDisabled("chat", { FEATURE_DISABLE_CHAT: "true" })).toBe(
      true,
    );
    expect(isFeatureDisabled("chat", { FEATURE_DISABLE_CHAT: "false" })).toBe(
      false,
    );
    expect(isFeatureDisabled("chat", { FEATURE_DISABLE_CHAT: "maybe" })).toBe(
      true,
    );
  });

  it("blocks chat before provider and without calling generate", async () => {
    process.env.FEATURE_DISABLE_CHAT = "true";
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await expect(
      runChatTurn({
        requestId: "11111111-1111-4111-8111-111111111301",
        auth: baseAuth,
        body: {
          message: "Quero uma reflexão sobre paz.",
          personaKey: "jesus",
          preferDeep: false,
        },
      }),
    ).rejects.toMatchObject({
      code: FEATURE_TEMPORARILY_DISABLED_CODE,
      status: 503,
    });
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("blocks deepen only while leaving standard chat path open to provider", async () => {
    process.env.FEATURE_DISABLE_DEEPEN = "true";
    generateSpy.mockResolvedValue({
      answer: "Resposta padrão.",
      biblicalReferences: [],
      interpretationNotice: "Aviso.",
      followUpQuestion: undefined,
      conversationMemory: "",
      inputTokens: 1,
      outputTokens: 1,
      model: "mock",
      latencyMs: 1,
      provider: "mock" as const,
      groundingProvider: "curated_v1" as const,
      retrievedReferenceIds: [],
      groundingCount: 0,
    });
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await expect(
      runChatTurn({
        requestId: "11111111-1111-4111-8111-111111111302",
        auth: baseAuth,
        body: {
          message: "Quero aprofundar esta situação com calma.",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({
      code: FEATURE_TEMPORARILY_DISABLED_CODE,
      status: 503,
    });
    expect(generateSpy).not.toHaveBeenCalled();

    await runChatTurn({
      requestId: "11111111-1111-4111-8111-111111111303",
      auth: baseAuth,
      body: {
        message: "Quero uma reflexão padrão sobre paz.",
        personaKey: "jesus",
        preferDeep: false,
      },
    });
    expect(generateSpy).toHaveBeenCalled();
  });

  it("catalogues feature_temporarily_disabled and maps to unavailable UI", () => {
    expect(isStableChatErrorCode(FEATURE_TEMPORARILY_DISABLED_CODE)).toBe(true);
    const view = resolveChatClientError({
      status: 503,
      code: FEATURE_TEMPORARILY_DISABLED_CODE,
      message: "O chat está temporariamente indisponível.",
    });
    expect(view.kind).toBe("unavailable");
    expect(view.message.toLowerCase()).not.toMatch(/plano|upgrade|profundo/);
  });

  it("blocks ensureJourneyStarted RSC path when journeys kill switch is on", async () => {
    process.env.FEATURE_DISABLE_JOURNEYS = "true";
    const { ensureJourneyStarted } = await import("@/lib/journeys/server");
    await expect(
      ensureJourneyStarted(baseAuth.userId, "paz-no-caos"),
    ).rejects.toMatchObject({
      code: FEATURE_TEMPORARILY_DISABLED_CODE,
      status: 503,
    });
  });

  it("journey detail/step pages redirect when journeys kill switch is on", async () => {
    const detail = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/(platform)/jornadas/[slug]/page.tsx", "utf8"),
    );
    const step = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/(platform)/jornadas/[slug]/[step]/page.tsx", "utf8"),
    );
    expect(detail).toContain('isFeatureDisabled("journeys")');
    expect(step).toContain('isFeatureDisabled("journeys")');
    expect(detail).toContain('redirect("/jornadas")');
    expect(step).toContain('redirect("/jornadas")');
  });
});
