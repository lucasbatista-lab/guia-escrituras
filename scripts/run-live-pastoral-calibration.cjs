#!/usr/bin/env node
"use strict";

/**
 * Opt-in live pastoral calibration.
 * NEVER runs in CI. Fails clearly without OPENAI_API_KEY.
 *
 * Usage:
 *   pnpm eval:pastoral-live
 *
 * Optional ignored env file (gitignored via /tmp/):
 *   tmp/.env.live.local  with OPENAI_API_KEY=...
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
  console.error(
    "Refuse: live pastoral calibration must not run in CI (opt-in only).",
  );
  process.exit(2);
}

loadEnvFile(path.join(process.cwd(), "tmp", ".env.live.local"));
loadEnvFile(path.join(process.cwd(), "tmp", ".env.live.secrets.local"));
loadEnvFile(path.join(process.cwd(), "tmp", ".env.production.local"));

const key = process.env.OPENAI_API_KEY?.trim();
if (!key || key === "[SENSITIVE]") {
  console.error(
    "OPENAI_API_KEY missing or placeholder. Vercel Secret-type values cannot be pulled by CLI.",
  );
  console.error(
    "Place the production key in ignored tmp/.env.live.local (never commit), then re-run:",
  );
  console.error("  pnpm eval:pastoral-live");
  process.exit(2);
}

process.env.LIVE_PASTORAL_CALIBRATION = "1";

const entry = path.join(
  process.cwd(),
  "tests",
  "evals",
  "pastoral-live",
  "live-calibration.test.ts",
);

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "vitest", "run", entry],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);

process.exit(result.status == null ? 1 : result.status);
