import { describe, expect, it, afterEach } from "vitest";
import {
  getSupabasePublishableKey,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";
import {
  allowsMocks,
  getAppRuntime,
  requiresRealOpenAiForChat,
  requiresRealSupabase,
} from "@/config/runtime";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";

describe("supabase public keys", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
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
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("allows mocks in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.DEMO_MODE;
    expect(getAppRuntime()).toBe("development");
    expect(allowsMocks()).toBe(true);
    expect(requiresRealSupabase()).toBe(false);
  });

  it("blocks mocks in production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.DEMO_MODE = "true";
    expect(getAppRuntime()).toBe("production");
    expect(allowsMocks()).toBe(false);
    expect(requiresRealOpenAiForChat()).toBe(true);
  });

  it("allows mocks in preview only with DEMO_MODE", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.DEMO_MODE;
    expect(allowsMocks()).toBe(false);
    process.env.DEMO_MODE = "true";
    expect(allowsMocks()).toBe(true);
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
