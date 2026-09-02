import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeChatNdjsonStream,
  encodeChatStreamLine,
  looksLikeStructuredJsonLeak,
  parseChatStreamLine,
  type ChatStreamEvent,
} from "@/lib/ai/chat-stream-protocol";
import { extractStreamedAnswer } from "@/lib/ai/structured-answer-stream";
import { OpenAiResponsesProvider } from "@/lib/ai/openai-provider";
import { getResponseDepthGuidance } from "@/lib/ai/response-depth";
import { getMaxOutputTokensForDepth } from "@/lib/ai/openai-config";
import { theologyPolicyResolver } from "@/lib/theology";
import { createBiblicalGroundingProvider } from "@/lib/biblical";
import { AppError } from "@/lib/safety";
import { resetChatTurnLocksForTests } from "@/lib/ai/chat-turn-lock";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import {
  openaiEventStream,
  openaiJsonDeltas,
} from "./helpers/openai-event-stream";

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
  userId: "user-stream-p0a",
  email: "stream@amemchat.test",
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

function mockGenerateResult(answer = "A paz começa no acolhimento sereno.") {
  return {
    answer,
    biblicalReferences: [{ book: "João", chapter: 14, verseStart: 27 }],
    interpretationNotice:
      "Referências e sínteses editoriais baseadas nas Escrituras.",
    followUpQuestion: "O que mais pesa agora?",
    conversationMemory:
      "Situação: busca de paz. Orientação: acolhimento. Ponto aberto: detalhe.",
    inputTokens: 80,
    outputTokens: 120,
    model: "mock",
    latencyMs: 40,
    provider: "mock" as const,
    groundingProvider: "curated_v1" as const,
    retrievedReferenceIds: ["jo-14-27"],
    groundingCount: 1,
    streamed: true,
    openaiTtftMs: 8,
    openaiCompleteMs: 40,
  };
}

function policy() {
  return theologyPolicyResolver.resolve({
    traditionKey: "ecumenical",
    personaKey: "jesus",
    userPrefs: {
      responseStyle: "pastoral",
      preferredDepth: "balanced",
      saintsContentEnabled: false,
      preferredBibleTranslation: null,
      denomination: null,
    },
  });
}

describe("chat stream protocol", () => {
  it("encodes and parses NDJSON events", () => {
    const started: ChatStreamEvent = {
      type: "started",
      requestId: "req-1",
      conversationId: "conv-1",
    };
    const line = encodeChatStreamLine(started);
    expect(line.endsWith("\n")).toBe(true);
    expect(parseChatStreamLine(line)).toEqual(started);
    expect(parseChatStreamLine("{not json")).toBeNull();
  });

  it("consumes a happy stream with multiple snapshots and a valid completed payload", async () => {
    const events: ChatStreamEvent[] = [
      {
        type: "started",
        requestId: "req-2",
        conversationId: "conv-2",
      },
      {
        type: "assistant_snapshot",
        requestId: "req-2",
        answer: "A paz",
      },
      {
        type: "assistant_snapshot",
        requestId: "req-2",
        answer: "A paz começa no acolhimento.",
      },
      {
        type: "completed",
        requestId: "req-2",
        payload: {
          answer: "A paz começa no acolhimento sereno.",
          biblicalReferences: [
            { book: "João", chapter: 14, verseStart: 27 },
          ],
          interpretationNotice: "Síntese editorial.",
          followUpQuestion: "Quer continuar?",
          usage: {
            level: "normal",
            label: "normal",
            inputTokens: 10,
            outputTokens: 20,
          },
          requestId: "req-2",
          conversationId: "conv-2",
          provider: "mock",
        },
      },
    ];
    const response = new Response(events.map(encodeChatStreamLine).join(""), {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
    const received: ChatStreamEvent[] = [];
    await consumeChatNdjsonStream(response, (event) => received.push(event));
    expect(received.map((e) => e.type)).toEqual([
      "started",
      "assistant_snapshot",
      "assistant_snapshot",
      "completed",
    ]);
    const completed = received[3];
    expect(completed?.type).toBe("completed");
    if (completed?.type === "completed") {
      expect(completed.payload.answer).not.toContain("{");
      expect(completed.payload.biblicalReferences[0]?.book).toBe("João");
    }
  });

  it("surfaces error events before the first delta and mid-stream", async () => {
    const before = new Response(
      encodeChatStreamLine({
        type: "error",
        requestId: "req-e1",
        code: "ai_failed",
        message: "Não foi possível gerar a reflexão agora.",
      }),
      { headers: { "Content-Type": "application/x-ndjson" } },
    );
    const early: ChatStreamEvent[] = [];
    await consumeChatNdjsonStream(before, (event) => early.push(event));
    expect(early[0]).toMatchObject({ type: "error", code: "ai_failed" });

    const mid = new Response(
      [
        encodeChatStreamLine({
          type: "started",
          requestId: "req-e2",
          conversationId: "conv-e2",
        }),
        encodeChatStreamLine({
          type: "assistant_snapshot",
          requestId: "req-e2",
          answer: "A paz",
        }),
        encodeChatStreamLine({
          type: "error",
          requestId: "req-e2",
          code: "ai_timeout",
          message: "A reflexão demorou mais do que o esperado.",
        }),
      ].join(""),
      { headers: { "Content-Type": "application/x-ndjson" } },
    );
    const later: ChatStreamEvent[] = [];
    await consumeChatNdjsonStream(mid, (event) => later.push(event));
    expect(later.map((e) => e.type)).toEqual([
      "started",
      "assistant_snapshot",
      "error",
    ]);
  });

  it("aborts NDJSON consumption when the signal fires", async () => {
    const abort = new AbortController();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            encodeChatStreamLine({
              type: "started",
              requestId: "req-abort",
              conversationId: "conv-abort",
            }),
          ),
        );
      },
    });
    const response = new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
    abort.abort();
    await expect(
      consumeChatNdjsonStream(response, () => undefined, abort.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("structured answer extraction", () => {
  it("extracts the human answer from official partial JSON and rejects leaks", () => {
    expect(extractStreamedAnswer('{"answer":"Paz no coração')).toBe(
      "Paz no coração",
    );
    expect(
      extractStreamedAnswer(
        '{"answer":"Paz no coração.","biblicalReferences":[',
      ),
    ).toBe("Paz no coração.");
    expect(extractStreamedAnswer("{")).toBeNull();
    expect(extractStreamedAnswer('{"biblicalReferences":[')).toBeNull();
    expect(looksLikeStructuredJsonLeak('{"answer":"x"}')).toBe(true);
    expect(looksLikeStructuredJsonLeak("A paz começa no acolhimento.")).toBe(
      false,
    );
  });
});

describe("OpenAI Responses streaming provider", () => {
  it("streams human snapshots from output_text.delta and validates the final object", async () => {
    const grounding = createBiblicalGroundingProvider().retrieve({
      question: "Estou ansioso e preciso de paz",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "stream-happy",
      limit: 2,
    });
    const top = grounding.retrieved[0]?.entry;
    expect(top).toBeTruthy();
    const json = JSON.stringify({
      answer:
        "A paz de Deus alcança o que a ansiedade não resolve. Em síntese, a passagem ensina confiança serena e um passo concreto hoje.",
      biblicalReferences: [
        {
          book: top!.book,
          chapter: top!.chapter,
          verseStart: top!.verseStart,
          verseEnd: top!.verseEnd,
          translation: null,
        },
      ],
      interpretationNotice:
        "Referências e sínteses editoriais, não citação literal.",
      followUpQuestion: "O que mais pesa neste momento?",
      conversationMemory:
        "Situação: busca de paz. Orientação: confiança. Ponto aberto: detalhe.",
    });
    const snapshots: string[] = [];
    const telemetry: Array<{ openaiStreamStartedAt?: number; openaiFirstDeltaAt?: number }> =
      [];
    const provider = new OpenAiResponsesProvider("sk-test");
    const stream = openaiEventStream(openaiJsonDeltas(json, 10));
    const createStream = vi.fn().mockReturnValue(stream);
    (
      provider as unknown as {
        client: { responses: { stream: typeof createStream } };
      }
    ).client = { responses: { stream: createStream } };

    const result = await provider.generate({
      messages: [],
      currentUserMessage: "Estou ansioso",
      theologyPolicy: policy(),
      model: "gpt-5-mini",
      requestId: "44444444-4444-4444-8444-444444444444",
      grounding,
      responseDepth: "balanced",
      onAnswerSnapshot: (answer) => snapshots.push(answer),
      onStreamTelemetry: (event) => telemetry.push(event),
    });

    expect(createStream).toHaveBeenCalled();
    expect(snapshots.length).toBeGreaterThan(1);
    for (const snapshot of snapshots) {
      expect(looksLikeStructuredJsonLeak(snapshot)).toBe(false);
      expect(snapshot).not.toContain("{");
      expect(snapshot).not.toContain("biblicalReferences");
    }
    expect(result.answer).toContain("paz de Deus");
    expect(result.streamed).toBe(true);
    expect(result.openaiTtftMs).toBeGreaterThanOrEqual(0);
    expect(telemetry.some((item) => item.openaiStreamStartedAt)).toBe(true);
    expect(telemetry.some((item) => item.openaiFirstDeltaAt)).toBe(true);
  });

  it("fails before the first human snapshot when the stream errors immediately", async () => {
    const snapshots: string[] = [];
    const provider = new OpenAiResponsesProvider("sk-test");
    const createStream = vi.fn().mockReturnValue(
      openaiEventStream([
        { type: "response.created" },
        { type: "error" },
      ]),
    );
    (
      provider as unknown as {
        client: { responses: { stream: typeof createStream } };
      }
    ).client = { responses: { stream: createStream } };

    await expect(
      provider.generate({
        messages: [],
        currentUserMessage: "Oi",
        theologyPolicy: policy(),
        model: "gpt-5-mini",
        requestId: "55555555-5555-4555-8555-555555555555",
        grounding: createBiblicalGroundingProvider().retrieve({
          question: "paz",
          traditionKey: "ecumenical",
          personaKey: "jesus",
          allowsSaintsContent: false,
          varietySeed: "err-early",
          limit: 2,
        }),
        onAnswerSnapshot: (answer) => snapshots.push(answer),
      }),
    ).rejects.toThrow(AppError);
    expect(snapshots).toEqual([]);
  });

  it("fails mid-stream without treating partial JSON as the final answer", async () => {
    const snapshots: string[] = [];
    const provider = new OpenAiResponsesProvider("sk-test");
    const createStream = vi.fn().mockReturnValue(
      openaiEventStream([
        { type: "response.created" },
        { type: "response.output_text.delta", delta: '{"answer":"Paz' },
        { type: "error" },
      ]),
    );
    (
      provider as unknown as {
        client: { responses: { stream: typeof createStream } };
      }
    ).client = { responses: { stream: createStream } };

    await expect(
      provider.generate({
        messages: [],
        currentUserMessage: "Oi",
        theologyPolicy: policy(),
        model: "gpt-5-mini",
        requestId: "66666666-6666-4666-8666-666666666666",
        grounding: createBiblicalGroundingProvider().retrieve({
          question: "paz",
          traditionKey: "ecumenical",
          personaKey: "jesus",
          allowsSaintsContent: false,
          varietySeed: "err-mid",
          limit: 2,
        }),
        onAnswerSnapshot: (answer) => snapshots.push(answer),
      }),
    ).rejects.toThrow(AppError);
    expect(snapshots.every((item) => !looksLikeStructuredJsonLeak(item))).toBe(
      true,
    );
  });

  it("maps abort and timeout to safe provider errors", async () => {
    const abort = new AbortController();
    abort.abort();
    const provider = new OpenAiResponsesProvider("sk-test");
    const createStream = vi.fn().mockReturnValue(
      openaiEventStream([{ type: "response.created" }]),
    );
    (
      provider as unknown as {
        client: { responses: { stream: typeof createStream } };
      }
    ).client = { responses: { stream: createStream } };

    await expect(
      provider.generate({
        messages: [],
        currentUserMessage: "Oi",
        theologyPolicy: policy(),
        model: "gpt-5-mini",
        requestId: "77777777-7777-4777-8777-777777777777",
        grounding: createBiblicalGroundingProvider().retrieve({
          question: "paz",
          traditionKey: "ecumenical",
          personaKey: "jesus",
          allowsSaintsContent: false,
          varietySeed: "abort",
          limit: 2,
        }),
        abortSignal: abort.signal,
      }),
    ).rejects.toMatchObject({ code: "ai_timeout" });

    const timeoutProvider = new OpenAiResponsesProvider("sk-test");
    const timeoutStream = vi.fn().mockImplementation(() => {
      throw Object.assign(new Error("Request timed out"), {
        name: "APIConnectionTimeoutError",
      });
    });
    (
      timeoutProvider as unknown as {
        client: { responses: { stream: typeof timeoutStream } };
      }
    ).client = { responses: { stream: timeoutStream } };

    await expect(
      timeoutProvider.generate({
        messages: [],
        currentUserMessage: "Oi",
        theologyPolicy: policy(),
        model: "gpt-5-mini",
        requestId: "88888888-8888-4888-8888-888888888888",
        grounding: createBiblicalGroundingProvider().retrieve({
          question: "paz",
          traditionKey: "ecumenical",
          personaKey: "jesus",
          allowsSaintsContent: false,
          varietySeed: "timeout",
          limit: 2,
        }),
      }),
    ).rejects.toMatchObject({ code: "ai_timeout" });
  });
});

describe("runChatTurnStream persistence and crisis", () => {
  beforeEach(() => {
    resetChatTurnLocksForTests();
    generateSpy.mockReset();
    generateSpy.mockImplementation(async (input: { onAnswerSnapshot?: (a: string) => void }) => {
      input.onAnswerSnapshot?.("A paz");
      input.onAnswerSnapshot?.("A paz começa no acolhimento sereno.");
      return mockGenerateResult();
    });
  });

  afterEach(() => {
    resetChatTurnLocksForTests();
  });

  it("yields snapshots then persists a single finalized assistant message", async () => {
    const { runChatTurnStream } = await import("@/lib/ai/chat-service");
    const requestId = "99999999-9999-4999-8999-999999999991";
    const events: ChatStreamEvent[] = [];
    for await (const event of runChatTurnStream({
      requestId,
      auth: { ...baseAuth, userId: "user-stream-persist" },
      body: { message: "Preciso de paz", personaKey: "jesus", preferDeep: false },
    })) {
      events.push(event);
    }

    expect(events[0]?.type).toBe("started");
    const snapshots = events.filter((e) => e.type === "assistant_snapshot");
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    for (const snapshot of snapshots) {
      if (snapshot.type === "assistant_snapshot") {
        expect(looksLikeStructuredJsonLeak(snapshot.answer)).toBe(false);
      }
    }
    const completed = events.at(-1);
    expect(completed?.type).toBe("completed");
    if (completed?.type === "completed") {
      expect(completed.payload.answer).toContain("acolhimento");
    }

    const repos = createMemoryRepositories();
    const listed = await repos.messages.listRecent(
      completed && completed.type === "completed"
        ? completed.payload.conversationId
        : "",
      "user-stream-persist",
      20,
    );
    expect(listed.filter((m) => m.role === "assistant")).toHaveLength(1);
    expect(listed.filter((m) => m.role === "user")).toHaveLength(1);
  });

  it("does not duplicate history on idempotent retry", async () => {
    const { runChatTurnStream } = await import("@/lib/ai/chat-service");
    const requestId = "99999999-9999-4999-8999-999999999992";
    const auth = { ...baseAuth, userId: "user-stream-idem" };
    const body = {
      message: "Preciso de paz",
      personaKey: "jesus" as const,
      preferDeep: false,
    };
    let conversationId = "";
    for await (const event of runChatTurnStream({ requestId, auth, body })) {
      if (event.type === "completed") conversationId = event.payload.conversationId;
    }
    const events: ChatStreamEvent[] = [];
    for await (const event of runChatTurnStream({
      requestId,
      auth,
      body: { ...body, conversationId },
    })) {
      events.push(event);
    }
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === "completed")).toBe(true);
    const repos = createMemoryRepositories();
    const listed = await repos.messages.listRecent(
      conversationId,
      "user-stream-idem",
      20,
    );
    expect(listed.filter((m) => m.role === "assistant")).toHaveLength(1);
  });

  it("does not persist a ghost assistant after a mid-stream failure", async () => {
    generateSpy.mockImplementationOnce(async (input: { onAnswerSnapshot?: (a: string) => void }) => {
      input.onAnswerSnapshot?.("A paz");
      throw Object.assign(new Error("provider down"), { status: 503 });
    });
    const { runChatTurnStream } = await import("@/lib/ai/chat-service");
    const requestId = "99999999-9999-4999-8999-999999999993";
    const auth = { ...baseAuth, userId: "user-stream-fail" };
    const events: ChatStreamEvent[] = [];
    await expect(async () => {
      for await (const event of runChatTurnStream({
        requestId,
        auth,
        body: {
          message: "Preciso de paz",
          personaKey: "jesus",
          preferDeep: false,
        },
      })) {
        events.push(event);
      }
    }).rejects.toMatchObject({ code: "ai_provider_unavailable" });

    expect(events.some((e) => e.type === "assistant_snapshot")).toBe(true);
    expect(events.some((e) => e.type === "completed")).toBe(false);
    const started = events.find((e) => e.type === "started");
    expect(started?.type).toBe("started");
    if (started?.type === "started") {
      const repos = createMemoryRepositories();
      const listed = await repos.messages.listRecent(
        started.conversationId,
        "user-stream-fail",
        20,
      );
      expect(listed.filter((m) => m.role === "assistant")).toHaveLength(0);
    }
  });

  it("keeps crisis intercept complete and unstreamed from the model", async () => {
    const { runChatTurnStream } = await import("@/lib/ai/chat-service");
    const events: ChatStreamEvent[] = [];
    for await (const event of runChatTurnStream({
      requestId: "99999999-9999-4999-8999-999999999994",
      auth: { ...baseAuth, userId: "user-stream-crisis" },
      body: {
        message: "Estou considerando não viver mais.",
        personaKey: "jesus",
        preferDeep: false,
      },
    })) {
      events.push(event);
    }
    expect(generateSpy).not.toHaveBeenCalled();
    const completed = events.find((e) => e.type === "completed");
    expect(completed?.type).toBe("completed");
    if (completed?.type === "completed") {
      expect(completed.payload.safetyMode).toBe("crisis");
      expect(completed.payload.answer.length).toBeGreaterThan(80);
    }
  });
});

describe("initial concise depth vs deepen", () => {
  it("keeps balanced in the 180–350 band and deepen on the deep band", () => {
    const balanced = getResponseDepthGuidance("balanced");
    const deep = getResponseDepthGuidance("deep");
    expect(balanced.wordRange).toEqual({ min: 180, max: 350 });
    expect(deep.wordRange).toEqual({ min: 600, max: 1000 });
    expect(balanced.promptLines.join("\n")).toContain("180–350");
    expect(deep.promptLines.join("\n")).toContain("600–1000");
    expect(getMaxOutputTokensForDepth("balanced")).toBe(1800);
    expect(getMaxOutputTokensForDepth("deep")).toBe(6000);
    expect(getMaxOutputTokensForDepth("deep")).toBeGreaterThan(
      getMaxOutputTokensForDepth("balanced"),
    );
  });
});

describe("streaming contracts in source", () => {
  it("uses NDJSON on /api/chat and incremental UI without aria-live on the bubble", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/chat/route.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/chat/chat-panel.tsx"),
      "utf8",
    );
    const service = readFileSync(
      join(process.cwd(), "src/lib/ai/chat-service.ts"),
      "utf8",
    );
    expect(route).toContain("application/x-ndjson");
    expect(route).toContain("runChatTurnStream");
    expect(route).toContain("maxDuration");
    expect(panel).toContain("consumeChatNdjsonStream");
    expect(panel).toContain("upsertStreamingAssistantMessage");
    expect(panel).toContain("looksLikeStructuredJsonLeak");
    expect(panel).toContain("aria-busy={loading}");
    const articleOpen = panel.match(/<article[\s\S]*?>/)?.[0] ?? "";
    expect(articleOpen).toContain("aria-label");
    expect(articleOpen).not.toContain("aria-live");
    expect(service).toContain("openai_ttft_ms");
    expect(service).toContain("streamed:");
    expect(service).not.toMatch(/prompt:/);
  });
});
