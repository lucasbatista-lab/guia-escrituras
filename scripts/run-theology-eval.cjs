#!/usr/bin/env node
"use strict";

/**
 * Offline theology eval CLI.
 * Never reads secrets; never calls OpenAI.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ci = process.argv.includes("--ci");
const env = {
  ...process.env,
  THEOLOGY_EVAL_CLI: ci ? "ci" : "full",
};

const vitestEntry = path.join(
  process.cwd(),
  "tests",
  "evals",
  "theology",
  "eval-cli.test.ts",
);

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "vitest", "run", vitestEntry],
  {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  },
);

process.exit(result.status == null ? 1 : result.status);
