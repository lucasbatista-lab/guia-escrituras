import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const require = createRequire(import.meta.url);
const { ENV_MATRIX } = require("../scripts/launch-env-matrix.cjs") as {
  ENV_MATRIX: Array<{
    name: string;
    visibility: string;
    sensitive: boolean;
    production: string;
  }>;
};

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("env isolation helper", () => {
  const base = snapshotEnv();

  afterEach(() => {
    restoreEnv(base);
    vi.resetModules();
  });

  it("restores keys without replacing process.env object", () => {
    const identity = process.env;
    process.env.__LAUNCH_CUTOVER_PROBE__ = "1";
    restoreEnv(base);
    expect(process.env).toBe(identity);
    expect(process.env.__LAUNCH_CUTOVER_PROBE__).toBeUndefined();
  });

  it("does not leak production openai gate across restores", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_MODE;
    vi.resetModules();
    const gated = await import("@/lib/ai/gateway");
    expect(() => gated.createAiProvider()).toThrow(/openai_unavailable/);

    restoreEnv(base);
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    vi.resetModules();
    const open = await import("@/lib/ai/gateway");
    expect(open.isOpenAiConfigured()).toBe(false);
    expect(open.createAiProvider().constructor.name).toBe("MockAiProvider");
  });
});

describe("env matrix consistency", () => {
  it("keeps secrets server-only and documents required names in .env.example", () => {
    const envExample = read(".env.example");
    for (const row of ENV_MATRIX) {
      if (row.sensitive) {
        expect(row.visibility).toBe("server");
        expect(row.name.startsWith("NEXT_PUBLIC_")).toBe(false);
      }
      if (row.production === "required") {
        if (
          row.name === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
          row.name === "SUPABASE_SERVICE_ROLE_KEY"
        ) {
          continue;
        }
        expect(envExample).toContain(`${row.name}=`);
      }
    }
    expect(envExample).not.toContain("NEXT_PUBLIC_CRON_SECRET");
    expect(envExample).not.toMatch(/CRON_SECRET=\S+/);
    expect(envExample).not.toMatch(/OPENAI_API_KEY=\S+/);
    expect(envExample).not.toMatch(/STRIPE_SECRET_KEY=\S+/);
  });

  it("cron secret is server-only in source", () => {
    const cronAuth = read("src", "lib", "reports", "cron-auth.ts");
    expect(cronAuth).toContain("CRON_SECRET");
    expect(cronAuth).not.toContain("NEXT_PUBLIC_CRON");
    const health = read("src", "app", "api", "health", "route.ts");
    expect(health).not.toContain("CRON_SECRET");
    expect(health).not.toContain("OPENAI_API_KEY");
    expect(health).not.toContain("STRIPE_SECRET");
  });
});

describe("canonical domain and public surfaces", () => {
  it("defaults to amemchat.com.br and rejects old host as canonical", () => {
    const appUrl = read("src", "lib", "auth", "app-url.ts");
    expect(appUrl).toContain("https://amemchat.com.br");
    expect(appUrl).not.toContain("guia-escrituras.vercel.app");
    expect(existsSync(join(root, "src", "app", "robots.ts"))).toBe(true);
    expect(existsSync(join(root, "src", "app", "sitemap.ts"))).toBe(true);
    const robots = read("src", "app", "robots.ts");
    expect(robots).toContain("/admin");
    expect(robots).toContain("/conversar");
  });
});

describe("documentation honesty for cutover", () => {
  it("runbook contains critical cutover stages", () => {
    const runbook = read("docs", "PRODUCTION_CUTOVER_RUNBOOK.md");
    for (const token of [
      "Pré-deploy",
      "CRON_SECRET",
      "STRIPE_SECRET_KEY",
      "OPENAI_API_KEY",
      "migration 004",
      "Rollback",
      "Smoke humano",
      "APP_URL",
    ]) {
      expect(runbook.toLowerCase()).toContain(token.toLowerCase());
    }
  });

  it("checklist separates local done from production pending", () => {
    const checklist = read("docs", "LAUNCH_CHECKLIST.md");
    expect(checklist).toContain("implementado e testado **localmente**");
    expect(checklist).toContain("depende de **produção**");
    expect(checklist).toMatch(/DNS[\s\S]*?- \[ \]/);
    expect(checklist).toMatch(/Stripe live[\s\S]*?- \[ \]/);
    expect(checklist).not.toMatch(/pagamento real controlado\s*\n-\s*\[x\]/i);
  });

  it("docs no longer claim missing OG, rate limit, daily reports, or mock Stripe checkout", () => {
    const deployment = read("docs", "DEPLOYMENT.md");
    const architecture = read("docs", "ARCHITECTURE.md");
    const next = read("docs", "NEXT_STEPS.md");
    expect(deployment).toContain("CRON_SECRET");
    expect(deployment).toMatch(/Stripe \(código live-ready\)/i);
    expect(architecture).toMatch(/rate limit/i);
    expect(architecture).toMatch(/OG/i);
    expect(architecture).toMatch(/Relatório diário/i);
    expect(architecture).toMatch(/Profundo/i);
    expect(architecture).toMatch(/histórico/i);
    expect(next).toContain("PRODUCTION_CUTOVER_RUNBOOK");
    expect(deployment).not.toMatch(/admin metrics.*mock/i);
  });

  it("does not embed secret-looking values in cutover docs", () => {
    for (const rel of [
      "docs/PRODUCTION_CUTOVER_RUNBOOK.md",
      "docs/LAUNCH_CHECKLIST.md",
      "docs/DEPLOYMENT.md",
      "docs/DAILY_REPORTS.md",
    ]) {
      const body = read(...rel.split("/"));
      expect(body).not.toMatch(/sk_live_[A-Za-z0-9]{8,}/);
      expect(body).not.toMatch(/whsec_[A-Za-z0-9]{8,}/);
      expect(body).not.toMatch(/sk_test_[A-Za-z0-9]{8,}/);
    }
  });
});

describe("launch:check script", () => {
  it("is a static gate without external network calls", () => {
    const src = read("scripts", "launch-check.cjs");
    const matrix = read("scripts", "launch-env-matrix.cjs");
    expect(src).toContain("launch-env-matrix");
    expect(src).not.toMatch(/stripe\.com|api\.openai\.com|supabase\.co\/rest/i);
    expect(src).not.toContain("fetch(");
    expect(matrix).toContain("CRON_SECRET");
    expect(matrix).toContain("NEXT_PUBLIC_APP_URL");
    expect(read("package.json")).toContain("launch:check");
  });

  it("passes when executed", () => {
    const result = spawnSync("node", ["scripts/launch-check.cjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env },
      timeout: 30_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("launch:check OK");
    expect(result.stdout).not.toMatch(/sk_live_|whsec_/);
  });
});

describe("prior launch blocks remain wired", () => {
  it("preserves admin, chat reliability, SEO, and daily report entrypoints", () => {
    expect(existsSync(join(root, "src", "app", "admin", "page.tsx"))).toBe(
      true,
    );
    expect(
      existsSync(join(root, "src", "app", "api", "cron", "daily-report", "route.ts")),
    ).toBe(true);
    expect(
      existsSync(join(root, "src", "lib", "usage", "short-rate-limit.ts")),
    ).toBe(true);
    expect(existsSync(join(root, "src", "app", "robots.ts"))).toBe(true);
    const vercel = JSON.parse(read("vercel.json"));
    expect(vercel.crons?.[0]?.path).toBe("/api/cron/daily-report");
    // Admin API surface exists (route names may vary; directory must be present)
    expect(existsSync(join(root, "src", "app", "api", "admin"))).toBe(true);
  });
});
