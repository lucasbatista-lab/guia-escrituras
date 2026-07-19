import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";

/**
 * Deterministic env+module isolation. Do not rely on wall-clock timeouts or
 * mutable global module state leaking across cases.
 */

describe("secret key server-only module", () => {
  let envSnap: NodeJS.ProcessEnv;

  beforeEach(() => {
    envSnap = snapshotEnv();
  });

  afterEach(() => {
    vi.resetModules();
    restoreEnv(envSnap);
  });

  it("prefers SUPABASE_SECRET_KEY over service role", async () => {
    process.env.SUPABASE_SECRET_KEY = "secret-new";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-old";
    vi.resetModules();
    const { getSupabaseSecretKey } = await import("@/lib/supabase/secret");
    expect(getSupabaseSecretKey()).toBe("secret-new");
  });

  it("falls back to service role key", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-old";
    vi.resetModules();
    const { getSupabaseSecretKey } = await import("@/lib/supabase/secret");
    expect(getSupabaseSecretKey()).toBe("service-old");
  });
});

describe("openai unavailable in production-like mode", () => {
  let envSnap: NodeJS.ProcessEnv;

  beforeEach(() => {
    envSnap = snapshotEnv();
  });

  afterEach(() => {
    vi.resetModules();
    restoreEnv(envSnap);
  });

  it("createAiProvider throws when mocks are blocked and no key", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_MODE;
    vi.resetModules();
    const { createAiProvider } = await import("@/lib/ai/gateway");
    expect(() => createAiProvider()).toThrow(/openai_unavailable/);
  });

  it("is deterministic across repeated isolated imports", async () => {
    for (let i = 0; i < 12; i += 1) {
      restoreEnv(envSnap);
      delete process.env.OPENAI_API_KEY;
      process.env.VERCEL_ENV = "production";
      process.env.NODE_ENV = "production";
      delete process.env.DEMO_MODE;
      vi.resetModules();
      const { createAiProvider, isOpenAiConfigured } = await import(
        "@/lib/ai/gateway"
      );
      const { requiresRealOpenAiForChat } = await import("@/config/runtime");
      expect(isOpenAiConfigured()).toBe(false);
      expect(requiresRealOpenAiForChat()).toBe(true);
      expect(() => createAiProvider()).toThrow(/openai_unavailable/);
    }
  });
});
