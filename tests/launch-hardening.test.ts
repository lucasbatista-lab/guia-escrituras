import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { AppError, toClientError } from "@/lib/safety";
import {
  evaluateShortRateLimits,
  getShortRateLimitConfig,
} from "@/lib/usage";
import { maskEmail, maskStripeId, maskToken, maskUserId } from "@/lib/logging/mask";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const root = process.cwd();

describe("short-term chat rate limit", () => {
  it("blocks when 5 distinct requestIds land in 60s", () => {
    const result = evaluateShortRateLimits({
      countLast60s: 5,
      countLast10m: 5,
    });
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.retryAfterSeconds).toBe(60);
    }
  });

  it("blocks when 20 distinct requestIds land in 10 minutes", () => {
    const result = evaluateShortRateLimits({
      countLast60s: 4,
      countLast10m: 20,
    });
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.retryAfterSeconds).toBe(600);
    }
  });

  it("allows under the limits", () => {
    expect(
      evaluateShortRateLimits({ countLast60s: 4, countLast10m: 19 }).blocked,
    ).toBe(false);
  });

  it("is configurable via env", () => {
    const config = getShortRateLimitConfig({
      CHAT_RATE_LIMIT_PER_MINUTE: "3",
      CHAT_RATE_LIMIT_PER_10_MINUTES: "9",
    } as NodeJS.ProcessEnv);
    expect(config.perMinute.maxRequestIds).toBe(3);
    expect(config.perTenMinutes.maxRequestIds).toBe(9);
  });

  it("AppError exposes Retry-After for the chat route", () => {
    const error = new AppError(
      "rate_limited",
      "rate_limited",
      429,
      "Aguarde",
      60,
    );
    const client = toClientError(error);
    expect(client.status).toBe(429);
    expect(client.retryAfterSeconds).toBe(60);
    const route = readFileSync(
      join(root, "src", "app", "api", "chat", "route.ts"),
      "utf8",
    );
    expect(route).toContain("Retry-After");
  });

  it("chat service skips short limit for idempotent requestId retries", () => {
    const service = readFileSync(
      join(root, "src", "lib", "ai", "chat-service.ts"),
      "utf8",
    );
    expect(service).toContain("isIdempotentRetry");
    expect(service).toContain("evaluateShortRateLimits");
    expect(service).toContain("countUserMessagesSince");
  });
});

describe("SEO discoverability", () => {
  it("robots disallows private areas and points to sitemap in production", () => {
    const original = snapshotEnv();
    try {
      process.env.VERCEL_ENV = "production";
      process.env.NODE_ENV = "production";
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const doc = robots();
      const rule = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules;
      expect(rule?.disallow).toEqual(
        expect.arrayContaining([
          "/admin",
          "/api",
          "/conta",
          "/conversar",
          "/auth",
          "/confira-seu-email",
          "/recuperar-senha",
          "/jornada",
          "/jornadas",
        ]),
      );
      expect(doc.sitemap).toBe("https://amemchat.com.br/sitemap.xml");
      expect(doc.host).toBe("amemchat.com.br");
    } finally {
      restoreEnv(original);
    }
  });

  it("robots blocks all crawling outside production", () => {
    const original = snapshotEnv();
    try {
      process.env.VERCEL_ENV = "preview";
      process.env.NODE_ENV = "production";
      const doc = robots();
      const rule = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules;
      expect(rule?.disallow).toEqual("/");
      expect(doc.sitemap).toBeUndefined();
    } finally {
      restoreEnv(original);
    }
  });

  it("sitemap lists public routes only", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/") || u.match(/amemchat|vercel|localhost/))).toBe(
      true,
    );
    expect(urls.join(" ")).toContain("/planos");
    expect(urls.join(" ")).not.toContain("/admin");
    expect(urls.join(" ")).not.toContain("/api/");
    expect(urls.join(" ")).not.toContain("/conversar");
  });

  it("canonical never falls back to localhost or vercel.app in production", () => {
    const original = snapshotEnv();
    try {
      process.env.VERCEL_ENV = "production";
      process.env.NODE_ENV = "production";
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      process.env.VERCEL_URL = "guia-escrituras.vercel.app";
      expect(getCanonicalSiteUrl()).toBe("https://amemchat.com.br");
      expect(getCanonicalSiteUrl()).not.toContain("localhost");
      expect(getCanonicalSiteUrl()).not.toContain("vercel.app");
    } finally {
      restoreEnv(original);
    }
  });
});

describe("health without secrets", () => {
  it("health route does not reveal secret presence", () => {
    const src = readFileSync(
      join(root, "src", "app", "api", "health", "route.ts"),
      "utf8",
    );
    expect(src).not.toContain("openaiConfigured");
    expect(src).not.toContain("supabaseConfigured");
    expect(src).not.toContain("mocksAllowed");
    expect(src).not.toContain("OPENAI");
    expect(src).not.toContain("SECRET");
  });
});

describe("log masking", () => {
  it("masks email, user, stripe and tokens", () => {
    expect(maskEmail("giulia@example.com")).toBe("g***a@example.com");
    expect(maskUserId("11111111-2222-4333-8444-555555555555")).toBe(
      "usr_11111111",
    );
    expect(maskStripeId("sub_1234567890abcdef")).toMatch(/^sub_1234/);
    expect(maskToken("intent_abcdef")).toMatch(/^tok_/);
  });
});

describe("flaky secrets/openai regression (suite isolation)", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("survives twelve consecutive isolated production gate checks", async () => {
    const base = snapshotEnv();
    for (let i = 0; i < 12; i += 1) {
      restoreEnv(base);
      delete process.env.OPENAI_API_KEY;
      process.env.VERCEL_ENV = "production";
      process.env.NODE_ENV = "production";
      delete process.env.DEMO_MODE;
      vi.resetModules();
      const { createAiProvider } = await import("@/lib/ai/gateway");
      expect(() => createAiProvider()).toThrow(/openai_unavailable/);
    }
    restoreEnv(base);
  });
});
