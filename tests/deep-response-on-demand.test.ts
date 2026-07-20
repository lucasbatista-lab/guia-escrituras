import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canUseDeepResponseOnDemand,
  DEEP_RESPONSE_NOT_ENTITLED_MESSAGE,
  getPlanByKey,
} from "@/lib/entitlements";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { resolveChatModel, getDeepModel, getDefaultModel } from "@/lib/ai/gateway";
import { resolveChatResponseDepth } from "@/lib/ai/response-depth";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import type { PlanKey } from "@/lib/entitlements";
import type { PreferredDepth } from "@/lib/theology";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

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

function authFor(opts: {
  userId: string;
  planKey: PlanKey | null;
  preferredDepth?: PreferredDepth;
  subscriptionStatus?: string | null;
}) {
  return {
    userId: opts.userId,
    email: `${opts.userId}@example.com`,
    spiritualProfile: {
      traditionKey: "ecumenical" as const,
      denomination: null,
      preferredBibleTranslation: null,
      responseStyle: "reflective" as const,
      preferredDepth: opts.preferredDepth ?? ("balanced" as const),
      saintsContentEnabled: false,
      onboardingCompleted: true,
    },
    planKey: opts.planKey,
    subscriptionStatus: opts.subscriptionStatus ?? "active",
    subscriptionPeriodEnd: null,
    hasStripeSubscription: Boolean(opts.planKey),
    hasDuplicateSubscriptions: false,
    isAdmin: false,
    demoMode: true,
  };
}

function mockGenerate(topic = "paz") {
  return {
    answer: `Reflexão sobre ${topic}.`,
    biblicalReferences: [{ book: "Salmos", chapter: 23, verseStart: 1 }],
    interpretationNotice: SHORT_INTERPRETATION_NOTICE,
    followUpQuestion: "Quer continuar?",
    conversationMemory: `Situação: ${topic}.`,
    inputTokens: 50,
    outputTokens: 80,
    model: "mock",
    latencyMs: 1,
    provider: "mock" as const,
    groundingProvider: "curated_v1",
    retrievedReferenceIds: ["sl-23-1"],
    groundingCount: 1,
  };
}

describe("canUseDeepResponseOnDemand", () => {
  it("allows Profundo and Particular only", () => {
    expect(canUseDeepResponseOnDemand("essencial")).toBe(false);
    expect(canUseDeepResponseOnDemand("caminho")).toBe(false);
    expect(canUseDeepResponseOnDemand("profundo")).toBe(true);
    expect(canUseDeepResponseOnDemand("particular")).toBe(true);
    expect(canUseDeepResponseOnDemand(null)).toBe(false);
  });
});

describe("preferDeep schema", () => {
  it("defaults preferDeep to false and rejects non-boolean", () => {
    expect(chatRequestSchema.parse({ message: "Olá" }).preferDeep).toBe(false);
    expect(
      chatRequestSchema.safeParse({ message: "Olá", preferDeep: "true" }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({ message: "Olá", preferDeep: 1 }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.parse({ message: "Olá", preferDeep: true }).preferDeep,
    ).toBe(true);
  });
});

describe("deep model routing (no network)", () => {
  it("routes preferDeep to deep model and depth guidance", () => {
    expect(resolveChatModel({ preferDeep: true })).toBe(getDeepModel());
    expect(resolveChatModel({ preferDeep: false })).toBe(getDefaultModel());
    expect(
      resolveChatResponseDepth({
        preferredDepth: "brief",
        preferDeep: true,
      }),
    ).toBe("deep");
    expect(
      resolveChatResponseDepth({
        preferredDepth: "deep",
        preferDeep: false,
      }),
    ).toBe("deep");
  });
});

describe("runChatTurn preferDeep entitlement", () => {
  beforeEach(() => {
    generateSpy.mockReset();
    generateSpy.mockResolvedValue(mockGenerate());
  });

  it("Essencial + preferDeep=false uses standard path", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const result = await runChatTurn({
      requestId: "d1111111-1111-4111-8111-111111111101",
      auth: authFor({ userId: "deep-ess-std", planKey: "essencial" }),
      body: {
        message: "Preciso de paz",
        personaKey: "jesus",
        preferDeep: false,
      },
    });
    expect(result.answer).toContain("paz");
    expect(generateSpy).toHaveBeenCalledTimes(1);
    const call = generateSpy.mock.calls[0]?.[0] as { responseDepth?: string };
    expect(call.responseDepth).toBe("balanced");
  });

  it("Essencial + preferDeep=true blocks before OpenAI", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertSpy = vi.spyOn(sharedRepos.messages, "insertUserMessage");
    await expect(
      runChatTurn({
        requestId: "d1111111-1111-4111-8111-111111111102",
        auth: authFor({ userId: "deep-ess-block", planKey: "essencial" }),
        body: {
          message: "Preciso de paz",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({
      code: "deep_response_not_entitled",
      status: 403,
      safeMessage: DEEP_RESPONSE_NOT_ENTITLED_MESSAGE,
    });
    expect(generateSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("Caminho + preferDeep=true blocks", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await expect(
      runChatTurn({
        requestId: "d1111111-1111-4111-8111-111111111103",
        auth: authFor({ userId: "deep-cam-block", planKey: "caminho" }),
        body: {
          message: "Situação complexa",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({ code: "deep_response_not_entitled", status: 403 });
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("Profundo + preferDeep=true uses deep depth and records chat_deep", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertEventSpy = vi.spyOn(sharedRepos.usage, "insertEvent");
    const result = await runChatTurn({
      requestId: "d1111111-1111-4111-8111-111111111104",
      auth: authFor({
        userId: "deep-pro-ok",
        planKey: "profundo",
        preferredDepth: "brief",
      }),
      body: {
        message: "Situação complexa que precisa de análise",
        personaKey: "jesus",
        preferDeep: true,
      },
    });
    expect(result.answer).toBeTruthy();
    expect(generateSpy).toHaveBeenCalledTimes(1);
    const call = generateSpy.mock.calls[0]?.[0] as {
      responseDepth?: string;
      currentUserMessage?: string;
    };
    expect(call.responseDepth).toBe("deep");
    expect(call.currentUserMessage).toBe(
      "Situação complexa que precisa de análise",
    );
    expect(insertEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ featureType: "chat_deep" }),
    );
  });

  it("Particular + preferDeep=true uses chat_deep", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertEventSpy = vi.spyOn(sharedRepos.usage, "insertEvent");
    await runChatTurn({
      requestId: "d1111111-1111-4111-8111-111111111105",
      auth: authFor({ userId: "deep-par-ok", planKey: "particular" }),
      body: {
        message: "Acompanhamento particular",
        personaKey: "jesus",
        preferDeep: true,
      },
    });
    expect(insertEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ featureType: "chat_deep" }),
    );
  });

  it("no subscription blocks before deep check", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await expect(
      runChatTurn({
        requestId: "d1111111-1111-4111-8111-111111111106",
        auth: authFor({
          userId: "deep-nosub",
          planKey: null,
          subscriptionStatus: null,
        }),
        body: {
          message: "Olá",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({ code: "subscription_required", status: 402 });
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("profile preferredDepth=deep does not grant preferDeep on Caminho", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await expect(
      runChatTurn({
        requestId: "d1111111-1111-4111-8111-111111111107",
        auth: authFor({
          userId: "deep-profile-only",
          planKey: "caminho",
          preferredDepth: "deep",
        }),
        body: {
          message: "Quero aprofundar",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({ code: "deep_response_not_entitled" });
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("Profundo standard turn records chat_standard and keeps profile depth", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertEventSpy = vi.spyOn(sharedRepos.usage, "insertEvent");
    await runChatTurn({
      requestId: "d1111111-1111-4111-8111-111111111108",
      auth: authFor({
        userId: "deep-pro-std",
        planKey: "profundo",
        preferredDepth: "brief",
      }),
      body: {
        message: "Mensagem comum",
        personaKey: "jesus",
        preferDeep: false,
      },
    });
    const call = generateSpy.mock.calls[0]?.[0] as { responseDepth?: string };
    expect(call.responseDepth).toBe("brief");
    expect(insertEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ featureType: "chat_standard" }),
    );
  });

  it("budget exceeded is not converted to entitlement error", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const { currentYearMonth } = await import("@/lib/utils");
    const userId = "deep-budget-block";
    await sharedRepos.usage.incrementMonthly({
      userId,
      yearMonth: currentYearMonth(),
      addBrlCents: 50_000_000,
    });

    await expect(
      runChatTurn({
        requestId: "d1111111-1111-4111-8111-111111111109",
        auth: authFor({ userId, planKey: "profundo" }),
        body: {
          message: "Ainda com margem?",
          personaKey: "jesus",
          preferDeep: true,
        },
      }),
    ).rejects.toMatchObject({ code: "budget_exceeded" });
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe("deep response UI and plan copy", () => {
  it("chat panel exposes deepen control only when canDeepen", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    const upsell = read("src", "components", "chat", "chat-plan-upsell.tsx");
    expect(panel).toContain("Aprofundar esta resposta");
    expect(panel).toContain("canDeepen");
    expect(panel).toContain("preferDeep: useDeep");
    expect(panel).toContain("DeepUpsellHint");
    expect(upsell).toContain("Conhecer o Profundo");
    expect(upsell).toContain('href="/planos#aprofundar"');
    expect(panel).toContain("aria-describedby");
    expect(panel).toContain("consome mais");
  });

  it("conversar page passes server-resolved canDeepen", () => {
    const page = read("src", "app", "(platform)", "conversar", "page.tsx");
    expect(page).toContain("canUseDeepResponseOnDemand");
    expect(page).toContain("canDeepen={canDeepen}");
  });

  it("Profundo lists on-demand deep as available now", () => {
    const profundo = getPlanByKey("profundo")!;
    expect(
      profundo.displayBenefits.some((b) => /aprofundar/i.test(b)),
    ).toBe(true);
    expect(
      profundo.upcomingBenefits?.some((b) => /aprofundar/i.test(b)),
    ).toBe(false);
    expect(profundo.priceMonthlyCents).toBe(18800);
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
    expect(getPlanByKey("particular")?.priceMonthlyCents).toBe(98800);
  });

  it("conta surfaces deep availability for entitled plans", () => {
    const conta = read("src", "app", "(platform)", "conta", "page.tsx");
    expect(conta).toContain("canUseDeepResponseOnDemand");
    expect(conta).toContain(
      "Resposta aprofundada sob demanda disponível no chat.",
    );
  });

  it("planos page distinguishes profile depth from on-demand deepen", () => {
    const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
    const shared = read("src", "lib", "entitlements", "reserved.ts");
    expect(shared).toContain("Profundidade de estilo");
    expect(planos).toContain("O que é Aprofundar?");
    expect(planos).toContain("SHARED_PLAN_INCLUDES");
  });

  it("does not alter Stripe checkout or webhook", () => {
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    expect(checkout).toContain("assessCheckoutEligibility");
    expect(webhook).toContain("handleStripeWebhookEvent");
  });
});
