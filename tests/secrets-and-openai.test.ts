import { describe, expect, it, afterEach, vi } from "vitest";

describe("secret key server-only module", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("prefers SUPABASE_SECRET_KEY over service role", async () => {
    process.env.SUPABASE_SECRET_KEY = "secret-new";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-old";
    const { getSupabaseSecretKey } = await import("@/lib/supabase/secret");
    expect(getSupabaseSecretKey()).toBe("secret-new");
  });

  it("falls back to service role key", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-old";
    const { getSupabaseSecretKey } = await import("@/lib/supabase/secret");
    expect(getSupabaseSecretKey()).toBe("service-old");
  });
});

describe("openai unavailable in production-like mode", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
    delete process.env.VERCEL_ENV;
    delete process.env.DEMO_MODE;
    process.env.NODE_ENV = "test";
  });

  it("createAiProvider throws when mocks are blocked and no key", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.OPENAI_API_KEY;
    const { createAiProvider } = await import("@/lib/ai/gateway");
    expect(() => createAiProvider()).toThrow();
  });
});
