import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";

describe("OPENAI_API_KEY gate (no network)", () => {
  const original = snapshotEnv();

  afterEach(() => {
    vi.resetModules();
    restoreEnv(original);
  });

  it("reports not configured without key", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { isOpenAiConfigured } = await import("@/lib/ai/gateway");
    expect(isOpenAiConfigured()).toBe(false);
  });

  it("throws 503 in production without key", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_MODE;
    vi.resetModules();

    const { requiresRealOpenAiForChat } = await import("@/config/runtime");
    const { createAiProvider } = await import("@/lib/ai/gateway");

    expect(requiresRealOpenAiForChat()).toBe(true);
    expect(() => createAiProvider()).toThrow(/openai_unavailable/);
  });

  it("stays deterministic when reordered relative to development mocks", async () => {
    // First: production gate
    delete process.env.OPENAI_API_KEY;
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_MODE;
    vi.resetModules();
    const prod = await import("@/lib/ai/gateway");
    expect(() => prod.createAiProvider()).toThrow(/openai_unavailable/);

    // Then: development allows mock without key
    restoreEnv(original);
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.DEMO_MODE;
    vi.resetModules();
    const { createAiProvider, isOpenAiConfigured } = await import(
      "@/lib/ai/gateway"
    );
    expect(isOpenAiConfigured()).toBe(false);
    expect(createAiProvider().constructor.name).toMatch(/Mock/i);
  });
});
