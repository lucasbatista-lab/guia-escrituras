#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const vitestEntry = path.join(
  process.cwd(),
  "tests",
  "evals",
  "journeys",
  "journey-content-eval.test.ts",
);

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "vitest", "run", vitestEntry],
  {
    stdio: "inherit",
    env: { ...process.env, THEOLOGY_JOURNEYS_EVAL_CLI: "1" },
    shell: process.platform === "win32",
  },
);

process.exit(result.status == null ? 1 : result.status);
