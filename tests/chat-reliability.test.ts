import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, toClientError } from "@/lib/safety";
import {
  evaluateShortRateLimits,
  getShortRateLimitConfig,
  getBudgetConfig,
  evaluateDailyBurst,
  evaluateMonthlyBudget,
} from "@/lib/usage";
import {
  parseRetryAfterHeader,
  resolveChatClientError,
} from "@/lib/ai/chat-client-errors";
import {
  mapOpenAiProviderError,
  openAiFailureToAppError,
} from "@/lib/ai/openai-errors";
import {
  resetChatTurnLocksForTests,
  tryAcquireChatTurnLock,
} from "@/lib/ai/chat-turn-lock";
import { IDENTITY_DISCLAIMER } from "@/lib/theology";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";

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

function mockResult(answer = "Resposta mock.") {
  return {
    answer,
    biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
    interpretationNotice: IDENTITY_DISCLAIMER,
    followUpQuestion: "Quer continuar?",
    conversationMemory: "Situação: teste. Orientação: acolhimento.",
    inputTokens: 10,
    outputTokens: 20,
    model: "mock",
    latencyMs: 1,
    provider: "mock" as const,
    groundingProvider: "curated_v1" as const,
    retrievedReferenceIds: ["jo-14-27"],
    groundingCount: 1,
  };
}

const baseAuth = {
  userId: "user-reliability",
  email: "r@example.com",
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

describe("chat reliability — short rate limits", () => {
  it("allows human-paced traffic under 5/min and 20/10min", () => {
    expect(
      evaluateShortRateLimits({ countLast60s: 4, countLast10m: 19 }).blocked,
    ).toBe(false);
  });

  it("blocks abusive burst at 5/min with Retry-After 60", () => {
    const result = evaluateShortRateLimits({
      countLast60s: 5,
      countLast10m: 5,
    });
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.retryAfterSeconds).toBe(60);
      expect(result.windowSeconds).toBe(60);
    }
  });

  it("blocks abusive sustained traffic at 20/10min with Retry-After 600", () => {
    const result = evaluateShortRateLimits({
      countLast60s: 3,
      countLast10m: 20,
    });
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.retryAfterSeconds).toBe(600);
    }
  });

  it("isolates limits per user via count queries keyed by userId", () => {
    const service = readFileSync(
      join(root, "src", "lib", "ai", "chat-service.ts"),
      "utf8",
    );
    expect(service).toContain("countUserMessagesSince");
    expect(service).toContain("auth.userId");
    expect(service).not.toContain("x-forwarded-for");
  });

  it("keeps commercial daily/monthly quotas distinct from short rate limit", () => {
    const essencial = getBudgetConfig("essencial");
    expect(essencial.dailyBurstLimit).toBe(40);
    expect(
      evaluateDailyBurst({
        requestsToday: 40,
        dailyBurstLimit: essencial.dailyBurstLimit,
      }).blocked,
    ).toBe(true);
    expect(
      evaluateMonthlyBudget({
        usedBrlCents: essencial.monthlyBudgetBrlCents,
        config: essencial,
      }).blocked,
    ).toBe(true);
    const short = getShortRateLimitConfig();
    expect(short.perMinute.maxRequestIds).toBe(5);
    expect(short.perTenMinutes.maxRequestIds).toBe(20);
  });

  it("health and admin routes are not wired to chat short rate limits", () => {
    const health = readFileSync(
      join(root, "src", "app", "api", "health", "route.ts"),
      "utf8",
    );
    expect(health).not.toContain("evaluateShortRateLimits");
    const adminExport = readFileSync(
      join(root, "src", "app", "api", "admin", "usuarios", "export", "route.ts"),
      "utf8",
    );
    expect(adminExport).not.toContain("evaluateShortRateLimits");
  });
});

describe("chat reliability — client error copy", () => {
  it("distinguishes plan limit, daily burst, frequency, in-progress and unavailable", () => {
    expect(resolveChatClientError({ status: 429, code: "budget_exceeded" }).kind).toBe(
      "plan_limit",
    );
    expect(resolveChatClientError({ status: 429, code: "burst_exceeded" }).kind).toBe(
      "daily_burst",
    );
    expect(resolveChatClientError({ status: 429, code: "rate_limited", retryAfterSeconds: 60 }).kind).toBe(
      "rate_limit",
    );
    expect(
      resolveChatClientError({
        status: 429,
        code: "rate_limited",
        retryAfterSeconds: 60,
      }).message,
    ).toMatch(/60s/);
    expect(resolveChatClientError({ status: 409, code: "turn_in_progress" }).kind).toBe(
      "in_progress",
    );
    expect(resolveChatClientError({ status: 503, code: "ai_timeout" }).kind).toBe(
      "unavailable",
    );
    expect(resolveChatClientError({ status: 503, code: "ai_failed" }).keepPendingRequest).toBe(
      true,
    );
  });

  it("parses Retry-After header", () => {
    expect(parseRetryAfterHeader("60")).toBe(60);
    expect(parseRetryAfterHeader("nope")).toBeNull();
  });

  it("chat panel uses resolveChatClientError", () => {
    const panel = readFileSync(
      join(root, "src", "components", "chat", "chat-panel.tsx"),
      "utf8",
    );
    expect(panel).toContain("resolveChatClientError");
    expect(panel).toContain("parseRetryAfterHeader");
  });
});

describe("chat reliability — OpenAI failure mapping", () => {
  it("maps provider 429 to safe 503 with Retry-After", () => {
    const mapped = mapOpenAiProviderError({
      status: 429,
      headers: { "retry-after": "12" },
      message: "Rate limit exceeded sk-secret",
    });
    expect(mapped.code).toBe("ai_provider_rate_limited");
    expect(mapped.status).toBe(503);
    expect(mapped.retryAfterSeconds).toBe(12);
    expect(mapped.safeMessage).not.toMatch(/sk-/);
    const err = openAiFailureToAppError({ status: 429, headers: { "retry-after": "12" } });
    const client = toClientError(err);
    expect(client.status).toBe(503);
    expect(client.retryAfterSeconds).toBe(12);
  });

  it("maps provider 5xx and timeouts safely", () => {
    expect(mapOpenAiProviderError({ status: 503 }).code).toBe(
      "ai_provider_unavailable",
    );
    expect(mapOpenAiProviderError({ name: "TimeoutError", message: "timed out" }).code).toBe(
      "ai_timeout",
    );
    const client = toClientError(
      openAiFailureToAppError({ status: 500, message: "stack at internal" }),
    );
    expect(client.message).not.toMatch(/stack/);
    expect(client.status).toBe(503);
  });

  it("openai provider disables SDK retries and sets timeout", () => {
    const src = readFileSync(
      join(root, "src", "lib", "ai", "openai-provider.ts"),
      "utf8",
    );
    expect(src).toContain("maxRetries: 0");
    expect(src).toContain("getOpenAiRequestTimeoutMs");
    expect(src).toContain("openAiFailureToAppError");
  });
});

describe("chat reliability — turn lock and runChatTurn", () => {
  beforeEach(() => {
    resetChatTurnLocksForTests();
    generateSpy.mockReset();
    generateSpy.mockResolvedValue(mockResult());
  });

  afterEach(() => {
    resetChatTurnLocksForTests();
  });

  it("process-local lock rejects a second acquire for the same turn", () => {
    const first = tryAcquireChatTurnLock("u1", "req-1");
    expect(first).not.toBeNull();
    expect(tryAcquireChatTurnLock("u1", "req-1")).toBeNull();
    expect(tryAcquireChatTurnLock("u2", "req-1")).not.toBeNull();
    first!.release();
    expect(tryAcquireChatTurnLock("u1", "req-1")).not.toBeNull();
  });

  it("concurrent same requestId: second call returns 409 without second AI call", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    let enteredGenerate = false;

    generateSpy.mockImplementationOnce(async () => {
      enteredGenerate = true;
      await gate;
      return mockResult("Primeira resposta");
    });

    const auth = { ...baseAuth, userId: "user-concurrent-same" };
    const firstPromise = runChatTurn({
      requestId,
      auth,
      body: { message: "Olá", personaKey: "jesus", preferDeep: false },
    });

    for (let i = 0; i < 50 && !enteredGenerate; i += 1) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(enteredGenerate).toBe(true);

    await expect(
      runChatTurn({
        requestId,
        auth,
        body: { message: "Olá", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({
      code: "turn_in_progress",
      status: 409,
    });

    releaseGate();
    const first = await firstPromise;
    expect(first.answer).toContain("Primeira");
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it("retry after AI failure does not duplicate user message or usage", async () => {
    const repos = createMemoryRepositories();
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const auth = { ...baseAuth, userId: "user-retry-fail" };

    generateSpy.mockRejectedValueOnce({ status: 503, message: "provider down" });

    await expect(
      runChatTurn({
        requestId,
        auth,
        body: { message: "Preciso de paz", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({ code: "ai_provider_unavailable", status: 503 });

    generateSpy.mockResolvedValueOnce(mockResult("Recuperada"));

    const ok = await runChatTurn({
      requestId,
      auth,
      body: { message: "Preciso de paz", personaKey: "jesus", preferDeep: false },
    });
    expect(ok.answer).toContain("Recuperada");

    let userCount = 0;
    let assistantCount = 0;
    for (const conv of await repos.conversations.listForUser(auth.userId, 20)) {
      const recent = await repos.messages.listRecent(conv.id, auth.userId, 50);
      userCount += recent.filter(
        (m) => m.role === "user" && m.requestId === requestId,
      ).length;
      assistantCount += recent.filter(
        (m) => m.role === "assistant" && m.requestId === requestId,
      ).length;
    }
    expect(userCount).toBe(1);
    expect(assistantCount).toBe(1);
    expect(generateSpy).toHaveBeenCalledTimes(2);

    const usage = await repos.usage.findEventByRequestId(auth.userId, requestId);
    expect(usage).not.toBeNull();
  });

  it("OpenAI 429 after user persist does not record usage success", async () => {
    const repos = createMemoryRepositories();
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const auth = { ...baseAuth, userId: "user-openai-429" };

    generateSpy.mockRejectedValueOnce({
      status: 429,
      headers: { "retry-after": "20" },
      message: "rate",
    });

    const err = await runChatTurn({
      requestId,
      auth,
      body: { message: "teste", personaKey: "jesus", preferDeep: false },
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("ai_provider_rate_limited");
    expect(err.retryAfterSeconds).toBe(20);
    expect(await repos.usage.findEventByRequestId(auth.userId, requestId)).toBeNull();
    expect(
      await repos.messages.findByRequestId(auth.userId, requestId, "user"),
    ).not.toBeNull();
    expect(
      await repos.messages.findByRequestId(auth.userId, requestId, "assistant"),
    ).toBeNull();
  });

  it("timeout mapping does not consume usage", async () => {
    const repos = createMemoryRepositories();
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const auth = { ...baseAuth, userId: "user-timeout" };

    generateSpy.mockRejectedValueOnce(
      Object.assign(new Error("Request timed out"), { name: "TimeoutError" }),
    );

    await expect(
      runChatTurn({
        requestId,
        auth,
        body: { message: "teste", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({ code: "ai_timeout", status: 503 });

    expect(await repos.usage.findEventByRequestId(auth.userId, requestId)).toBeNull();
  });

  it("short rate limit skips for idempotent retry of same requestId", async () => {
    const repos = createMemoryRepositories();
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const auth = { ...baseAuth, userId: "user-short-retry" };

    // Fill short window with 5 completed turns.
    for (let i = 0; i < 5; i += 1) {
      generateSpy.mockResolvedValueOnce(mockResult(`ok-${i}`));
      await runChatTurn({
        requestId: `11111111-1111-4111-8111-11111111111${i}`,
        auth,
        body: {
          message: `msg ${i}`,
          personaKey: "jesus",
          preferDeep: false,
        },
      });
    }

    const blockedId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await expect(
      runChatTurn({
        requestId: blockedId,
        auth,
        body: {
          message: "depois do limite",
          personaKey: "jesus",
          preferDeep: false,
        },
      }),
    ).rejects.toMatchObject({ code: "rate_limited", status: 429 });
    expect(generateSpy).toHaveBeenCalledTimes(5);

    // Separate user: failed turn then idempotent retry must skip short limit.
    generateSpy.mockReset();
    const auth2 = { ...baseAuth, userId: "user-short-retry-b" };
    const retryId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    generateSpy.mockRejectedValueOnce({ status: 503, message: "x" });
    await expect(
      runChatTurn({
        requestId: retryId,
        auth: auth2,
        body: { message: "retry me", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({ status: 503 });

    generateSpy.mockResolvedValueOnce(mockResult("retry ok"));
    const recovered = await runChatTurn({
      requestId: retryId,
      auth: auth2,
      body: { message: "retry me", personaKey: "jesus", preferDeep: false },
    });
    expect(recovered.answer).toContain("retry ok");
    expect(
      await repos.messages.findByRequestId(auth2.userId, retryId, "user"),
    ).not.toBeNull();
    expect(generateSpy).toHaveBeenCalledTimes(2);
  });

  it("Profundo preferDeep is not executed twice for the same requestId", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "12121212-1212-4121-8121-121212121212";
    const auth = {
      ...baseAuth,
      userId: "user-deep-once",
      planKey: "profundo" as const,
    };

    const first = await runChatTurn({
      requestId,
      auth,
      body: { message: "Aprofunda", personaKey: "jesus", preferDeep: true },
    });
    const second = await runChatTurn({
      requestId,
      auth,
      body: {
        message: "Aprofunda",
        personaKey: "jesus",
        preferDeep: true,
        conversationId: first.conversationId,
      },
    });
    expect(second.answer).toBe(first.answer);
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy.mock.calls[0]?.[0]).toMatchObject({
      responseDepth: "deep",
    });
  });

  it("subscription guard still blocks before persistence", async () => {
    const repos = createMemoryRepositories();
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "13131313-1313-4131-8131-131313131313";
    await expect(
      runChatTurn({
        requestId,
        auth: { ...baseAuth, userId: "user-no-sub", planKey: null },
        body: { message: "oi", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({ code: "subscription_required", status: 402 });
    expect(
      await repos.messages.findByRequestId("user-no-sub", requestId, "user"),
    ).toBeNull();
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("onboarding gate remains 403 personalization_required", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    await expect(
      runChatTurn({
        requestId: "14141414-1414-4141-8141-141414141414",
        auth: {
          ...baseAuth,
          userId: "user-onboarding",
          spiritualProfile: {
            ...baseAuth.spiritualProfile,
            onboardingCompleted: false,
          },
        },
        body: { message: "oi", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({
      code: "personalization_required",
      status: 403,
    });
  });

  it("chat route returns Retry-After for rate_limited and turn_in_progress", () => {
    const route = readFileSync(
      join(root, "src", "app", "api", "chat", "route.ts"),
      "utf8",
    );
    expect(route).toContain("Retry-After");
    const rate = toClientError(
      new AppError("rate_limited", "rate_limited", 429, "aguarde", 60),
    );
    expect(rate.retryAfterSeconds).toBe(60);
    const conflict = toClientError(
      new AppError("turn_in_progress", "turn_in_progress", 409, "em progresso", 5),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.retryAfterSeconds).toBe(5);
  });

  it("failed AI leaves conversation recoverable (no eternal processing placeholder)", async () => {
    const repos = createMemoryRepositories();
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const requestId = "15151515-1515-4151-8151-151515151515";
    const auth = { ...baseAuth, userId: "user-recoverable" };

    generateSpy.mockRejectedValueOnce({ status: 502, message: "bad gateway" });
    await expect(
      runChatTurn({
        requestId,
        auth,
        body: { message: "recupera", personaKey: "jesus", preferDeep: false },
      }),
    ).rejects.toMatchObject({ status: 503 });

    const user = await repos.messages.findByRequestId(
      auth.userId,
      requestId,
      "user",
    );
    const assistant = await repos.messages.findByRequestId(
      auth.userId,
      requestId,
      "assistant",
    );
    expect(user?.role).toBe("user");
    expect(assistant).toBeNull();

    generateSpy.mockResolvedValueOnce(mockResult("ok depois"));
    const recovered = await runChatTurn({
      requestId,
      auth,
      body: {
        message: "recupera",
        personaKey: "jesus",
        preferDeep: false,
        conversationId: user!.conversationId,
      },
    });
    expect(recovered.conversationId).toBe(user!.conversationId);
    expect(recovered.answer).toContain("ok depois");
  });
});
