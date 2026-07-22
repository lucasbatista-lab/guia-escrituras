import { describe, expect, it, afterEach } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import {
  getSupabasePublishableKey,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";
import {
  allowsMocks,
  assertDemoModeSafe,
  getAppRuntime,
  hasDemoSecretConflict,
  requiresRealOpenAiForChat,
  requiresRealSupabase,
} from "@/config/runtime";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";

describe("supabase public keys", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("prefers publishable over anon", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(getSupabasePublishableKey()).toBe("publishable");
    expect(hasSupabasePublicEnv()).toBe(true);
  });

  it("falls back to anon", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(getSupabasePublishableKey()).toBe("anon");
  });
});

describe("runtime mocks", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("allows mocks in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.DEMO_MODE;
    expect(getAppRuntime()).toBe("development");
    expect(allowsMocks()).toBe(true);
    expect(requiresRealSupabase()).toBe(false);
  });

  it("blocks mocks in production even with DEMO_MODE", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.DEMO_MODE = "true";
    expect(getAppRuntime()).toBe("production");
    expect(allowsMocks()).toBe(false);
    expect(requiresRealOpenAiForChat()).toBe(true);
  });

  it("allows mocks in preview only with DEMO_MODE and no remote project", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(allowsMocks()).toBe(false);
    process.env.DEMO_MODE = "true";
    expect(allowsMocks()).toBe(true);
  });

  it("rejects preview DEMO_MODE when Supabase public env is present", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.DEMO_MODE = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk_test";
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(allowsMocks()).toBe(false);
    expect(() => assertDemoModeSafe()).toThrow(/Configuração de ambiente inválida/);
  });

  it("rejects preview DEMO_MODE with live Stripe or service role secrets", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.DEMO_MODE = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_live_example_not_real";
    expect(hasDemoSecretConflict()).toBe(true);
    expect(allowsMocks()).toBe(false);
    try {
      assertDemoModeSafe();
      expect.unreachable("expected throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("sk_live_");
      expect(message).not.toContain("example_not_real");
    }
  });

  it("does not create production demo admin path via allowsMocks", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(allowsMocks()).toBe(false);
    expect(requiresRealSupabase()).toBe(true);
  });
});

describe("no free plan", () => {
  it("does not include a free plan", () => {
    expect(PLAN_DEFINITIONS.some((p) => p.key === "free")).toBe(false);
    expect(PLAN_DEFINITIONS.map((p) => p.key).sort()).toEqual(
      ["caminho", "essencial", "particular", "profundo"].sort(),
    );
    expect(
      PLAN_DEFINITIONS.find((p) => p.key === "particular")?.ctaType,
    ).toBe("request_access");
  });
});
