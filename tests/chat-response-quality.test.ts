import { describe, expect, it, vi } from "vitest";
import {
  getResponseDepthGuidance,
  resolveChatResponseDepth,
  groundingLimitForDepth,
} from "@/lib/ai/response-depth";
import {
  getMaxOutputTokensForDepth,
  getOpenAiReasoningEffortDefault,
} from "@/lib/ai/openai-config";
import { MockAiProvider } from "@/lib/ai/mock-provider";
import { OpenAiResponsesProvider } from "@/lib/ai/openai-provider";
import { theologyPolicyResolver, IDENTITY_DISCLAIMER } from "@/lib/theology";
import { createBiblicalGroundingProvider } from "@/lib/biblical";
import { AppError } from "@/lib/safety";
import { parseAndValidateAiProviderContent } from "@/lib/ai/provider-output";

describe("response depth guidance", () => {
  it("resolves brief, balanced and deep", () => {
    expect(
      resolveChatResponseDepth({ preferredDepth: "brief" }),
    ).toBe("brief");
    expect(
      resolveChatResponseDepth({ preferredDepth: "balanced" }),
    ).toBe("balanced");
    expect(resolveChatResponseDepth({ preferredDepth: "deep" })).toBe("deep");
    expect(
      resolveChatResponseDepth({ preferredDepth: "brief", preferDeep: true }),
    ).toBe("deep");
  });

  it("provides distinct size and reference guidance", () => {
    const brief = getResponseDepthGuidance("brief");
    const balanced = getResponseDepthGuidance("balanced");
    const deep = getResponseDepthGuidance("deep");

    expect(brief.referenceCount.max).toBe(2);
    expect(balanced.referenceCount.max).toBe(4);
    expect(deep.referenceCount.max).toBe(5);
    expect(brief.maxApplications).toBeLessThanOrEqual(3);
    expect(groundingLimitForDepth("brief")).toBe(2);
    expect(groundingLimitForDepth("deep")).toBe(5);
  });
});

describe("openai chat config defaults", () => {
  it("uses low reasoning effort by default without requiring env", () => {
    const prev = process.env.OPENAI_REASONING_EFFORT_DEFAULT;
    delete process.env.OPENAI_REASONING_EFFORT_DEFAULT;
    expect(getOpenAiReasoningEffortDefault()).toBe("low");
    if (prev !== undefined) process.env.OPENAI_REASONING_EFFORT_DEFAULT = prev;
  });

  it("exposes conservative max output defaults", () => {
    expect(getMaxOutputTokensForDepth("brief")).toBeGreaterThanOrEqual(800);
    expect(getMaxOutputTokensForDepth("balanced")).toBeGreaterThan(
      getMaxOutputTokensForDepth("brief"),
    );
    expect(getMaxOutputTokensForDepth("deep")).toBeGreaterThan(
      getMaxOutputTokensForDepth("balanced"),
    );
  });
});

describe("mock grounded response quality", () => {
  const grounding = createBiblicalGroundingProvider().retrieve({
    question: "Estou ansioso e preciso de paz",
    traditionKey: "ecumenical",
    personaKey: "jesus",
    allowsSaintsContent: false,
    varietySeed: "quality-1",
    limit: 3,
  });

  const policy = theologyPolicyResolver.resolve({
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

  it("does not start with the long identity disclaimer", async () => {
    const provider = new MockAiProvider();
    const result = await provider.generate({
      messages: [],
      currentUserMessage: "Estou ansioso",
      theologyPolicy: policy,
      model: "mock",
      requestId: "11111111-1111-4111-8111-111111111111",
      grounding,
      responseDepth: "balanced",
    });

    expect(result.answer.toLowerCase().startsWith("esta é uma experiência")).toBe(
      false,
    );
    expect(result.answer).not.toContain(IDENTITY_DISCLAIMER);
    expect(result.interpretationNotice.length).toBeGreaterThan(10);
    expect(result.interpretationNotice.length).toBeLessThan(220);
    expect(result.biblicalReferences.length).toBeGreaterThanOrEqual(1);
    expect(result.biblicalReferences.length).toBeLessThanOrEqual(4);
    expect(result.groundingProvider).toBe("curated_v1");
    expect(result.groundingCount).toBeGreaterThanOrEqual(1);
  });

  it("respects brief reference budget", async () => {
    const provider = new MockAiProvider();
    const result = await provider.generate({
      messages: [],
      currentUserMessage: "Estou ansioso",
      theologyPolicy: policy,
      model: "mock",
      requestId: "11111111-1111-4111-8111-111111111112",
      grounding,
      responseDepth: "brief",
    });
    expect(result.biblicalReferences.length).toBeLessThanOrEqual(2);
  });
});

describe("OpenAI provider incomplete / invalid (no network)", () => {
  it("throws safely on incomplete responses", async () => {
    const provider = new OpenAiResponsesProvider("sk-test");
    const create = vi.fn().mockResolvedValue({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: "",
      usage: { input_tokens: 10, output_tokens: 0 },
    });
    (provider as unknown as { client: { responses: { create: typeof create } } }).client =
      { responses: { create } };

    const grounding = createBiblicalGroundingProvider().retrieve({
      question: "paz",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "inc",
      limit: 2,
    });
    const policy = theologyPolicyResolver.resolve({
      traditionKey: "ecumenical",
      personaKey: "jesus",
      userPrefs: {
        responseStyle: "pastoral",
        preferredDepth: "brief",
        saintsContentEnabled: false,
        preferredBibleTranslation: null,
        denomination: null,
      },
    });

    await expect(
      provider.generate({
        messages: [],
        currentUserMessage: "Oi",
        theologyPolicy: policy,
        model: "gpt-5-mini",
        requestId: "11111111-1111-4111-8111-111111111113",
        grounding,
        responseDepth: "brief",
      }),
    ).rejects.toThrow(AppError);

    expect(create).toHaveBeenCalled();
    const callArg = create.mock.calls[0]?.[0] as {
      max_output_tokens?: number;
      reasoning?: { effort?: string };
    };
    expect(callArg.max_output_tokens).toBeGreaterThanOrEqual(800);
    expect(callArg.reasoning?.effort).toBe("low");
  });

  it("rejects invalid structured output without calling real network after mock", async () => {
    const provider = new OpenAiResponsesProvider("sk-test");
    const create = vi.fn().mockResolvedValue({
      status: "completed",
      output_text: "{not-json",
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    (provider as unknown as { client: { responses: { create: typeof create } } }).client =
      { responses: { create } };

    const grounding = createBiblicalGroundingProvider().retrieve({
      question: "paz",
      traditionKey: "ecumenical",
      personaKey: "jesus",
      allowsSaintsContent: false,
      varietySeed: "bad",
      limit: 2,
    });
    const policy = theologyPolicyResolver.resolve({
      traditionKey: "ecumenical",
      personaKey: "jesus",
      userPrefs: {
        responseStyle: "pastoral",
        preferredDepth: "brief",
        saintsContentEnabled: false,
        preferredBibleTranslation: null,
        denomination: null,
      },
    });

    await expect(
      provider.generate({
        messages: [],
        currentUserMessage: "Oi",
        theologyPolicy: policy,
        model: "gpt-5-mini",
        requestId: "11111111-1111-4111-8111-111111111114",
        grounding,
        responseDepth: "brief",
      }),
    ).rejects.toThrow(AppError);
  });

  it("still validates Zod output shape", () => {
    expect(() => parseAndValidateAiProviderContent("{}")).toThrow(AppError);
  });
});
