import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/safety";

describe("OPENAI_API_KEY gate (no network)", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reports not configured without key", async () => {
    delete process.env.OPENAI_API_KEY;
    const { isOpenAiConfigured } = await import("@/lib/ai/gateway");
    expect(isOpenAiConfigured()).toBe(false);
  });

  it("throws 503 in production without key", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";

    const { requiresRealOpenAiForChat } = await import("@/config/runtime");
    const { createAiProvider } = await import("@/lib/ai/gateway");

    expect(requiresRealOpenAiForChat()).toBe(true);
    expect(() => createAiProvider()).toThrow(AppError);
  });
});
