import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";

describe("demo/mock fail-closed boundaries", () => {
  const original = snapshotEnv();

  afterEach(() => {
    vi.resetModules();
    restoreEnv(original);
  });

  it("production never selects MockAiProvider", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.DEMO_MODE = "true";
    vi.resetModules();
    const { createAiProvider } = await import("@/lib/ai/gateway");
    const { allowsMocks } = await import("@/config/runtime");
    expect(allowsMocks()).toBe(false);
    expect(() => createAiProvider()).toThrow(/openai_unavailable/);
  });

  it("preview DEMO_MODE without remote stays on MockAiProvider", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.DEMO_MODE = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();
    const { createAiProvider } = await import("@/lib/ai/gateway");
    expect(createAiProvider().constructor.name).toMatch(/Mock/i);
  });

  it("real OpenAI key wins over DEMO_MODE mock path", async () => {
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.DEMO_MODE;
    vi.resetModules();
    const { createAiProvider } = await import("@/lib/ai/gateway");
    expect(createAiProvider().constructor.name).toMatch(/OpenAi/i);
  });

  it("requireAdminUser still requires real admin outside demo mocks", async () => {
    const session = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/auth/session.ts", "utf8"),
    );
    expect(session).toContain("ctx.demoMode && allowsMocks()");
    expect(session).toContain("isAdmin");
    expect(session).toContain("assertDemoModeSafe");
  });

  it("error paths never echo secret material", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.DEMO_MODE = "true";
    process.env.STRIPE_SECRET_KEY = "sk_live_super_secret_value";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.resetModules();
    const { assertDemoModeSafe, allowsMocks } = await import(
      "@/config/runtime"
    );
    expect(allowsMocks()).toBe(false);
    expect(() => assertDemoModeSafe()).toThrow();
    try {
      assertDemoModeSafe();
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      expect(text).not.toContain("sk_live_super_secret_value");
      expect(text).not.toContain("STRIPE_SECRET_KEY");
    }
  });
});
