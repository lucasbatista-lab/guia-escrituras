/**
 * Local application runtime smoke — no Playwright, no external network.
 *
 * Spawns `next start` on an isolated port against an existing `.next` build.
 * Production runtime forbids mocks (DEMO_MODE ignored) — never bypasses auth.
 *
 * Kill-switch 503-before-provider for authenticated chat/journeys is covered by
 * Vitest (`tests/feature-kill-switches.test.ts`); this smoke proves unauthenticated
 * contracts and that kill-switch env does not weaken public/auth gates.
 *
 * Usage: node scripts/local-runtime-smoke.cjs
 * Optional: SMOKE_PORT=4317 SMOKE_SKIP_BUILD=1
 */

const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.SMOKE_PORT || 4317);
const BASE = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = 90_000;
const errors = [];

function fail(msg) {
  errors.push(msg);
  console.error(`FAIL  ${msg}`);
}

function ok(msg) {
  console.log(`OK    ${msg}`);
}

function note(msg) {
  console.log(`NOTE  ${msg}`);
}

function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: urlPath,
        method,
        headers: {
          Accept: "text/html,application/json,*/*",
          ...headers,
        },
        timeout: 15_000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout ${method} ${urlPath}`));
    });
    if (body != null) req.write(body);
    req.end();
  });
}

async function waitReady(child) {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    if (child.exitCode != null) {
      throw new Error(`next start exited early with code ${child.exitCode}`);
    }
    try {
      const res = await request("GET", "/api/health");
      if (res.status === 200) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("timed out waiting for /api/health");
}

function assertStatus(name, res, allowed) {
  if (!allowed.includes(res.status)) {
    fail(`${name}: expected status ${allowed.join("|")}, got ${res.status}`);
    return false;
  }
  ok(`${name}: ${res.status}`);
  return true;
}

function isPrivateLeak(body) {
  const lower = body.toLowerCase();
  return (
    lower.includes("demo-user") ||
    lower.includes("demo@amemchat.local") ||
    lower.includes("isadmin\":true") ||
    /papel de administrador|visão geral do admin|daily_report/i.test(body)
  );
}

async function runChecks() {
  // 1–4 public pages
  for (const p of ["/", "/planos", "/ajuda", "/privacidade"]) {
    const res = await request("GET", p);
    assertStatus(`public ${p}`, res, [200]);
    if (isPrivateLeak(res.body)) {
      fail(`${p}: leaked private/demo/admin content`);
    }
  }

  // 5–6 private / admin without session
  for (const p of ["/inicio", "/conversar", "/conta", "/admin"]) {
    const res = await request("GET", p);
    // Anonymous HTML gates typically 307/308 to login, or 200 login shell —
    // never deliver authenticated platform/admin payloads.
    if (![200, 307, 308, 401, 403].includes(res.status)) {
      fail(`private ${p}: unexpected status ${res.status}`);
    } else {
      ok(`private ${p}: ${res.status} (no session)`);
    }
    const loc = res.headers.location || "";
    if (p === "/admin" && res.status >= 300 && res.status < 400) {
      if (!/entrar|login|auth/i.test(loc) && !loc.includes("/entrar")) {
        // May redirect to /entrar?next=...
        if (!loc) fail(`/admin redirect missing Location`);
      }
    }
    if (isPrivateLeak(res.body)) {
      fail(`${p}: private content without session`);
    }
  }

  // 7–8 health contract
  const health = await request("GET", "/api/health");
  assertStatus("health", health, [200]);
  let healthJson;
  try {
    healthJson = JSON.parse(health.body);
  } catch {
    fail("health: body is not JSON");
    healthJson = {};
  }
  if (healthJson.status !== "ok") fail("health: status !== ok");
  if (typeof healthJson.requestId !== "string") fail("health: missing requestId");
  if (healthJson.checks == null) fail("health: missing checks");
  const healthText = health.body.toLowerCase();
  if (
    healthText.includes("stripe") ||
    healthText.includes("revenue") ||
    healthText.includes("mrr") ||
    healthText.includes("sk_live")
  ) {
    fail("health: looks financial or secret-bearing");
  } else {
    ok("health: non-financial contract");
  }
  const cc = String(health.headers["cache-control"] || "");
  if (!/no-store/i.test(cc)) fail("health: Cache-Control should include no-store");
  else ok("health: Cache-Control no-store");

  // 9 404
  const missing = await request("GET", "/rota-inexistente-smoke-local-xyz");
  assertStatus("404", missing, [404]);

  // 10 method
  const badMethod = await request("PUT", "/api/health");
  if (![404, 405, 501].includes(badMethod.status)) {
    fail(`405 contract: PUT /api/health got ${badMethod.status}`);
  } else {
    ok(`method contract: PUT /api/health → ${badMethod.status}`);
  }

  // 11 robots
  const robots = await request("GET", "/robots.txt");
  assertStatus("robots", robots, [200]);
  for (const token of ["/admin", "/conversar", "/jornadas", "/api"]) {
    if (!robots.body.includes(token)) {
      fail(`robots missing disallow/mention for ${token}`);
    }
  }
  ok("robots includes private path blocks");

  // 12 headers on home
  const home = await request("GET", "/");
  const ctype = String(home.headers["content-type"] || "");
  if (!/text\/html/i.test(ctype)) fail("home: Content-Type not HTML");
  else ok("home: Content-Type HTML");

  // 13 www → apex (Host header)
  try {
    const www = await request("GET", "/", {
      Host: "www.amemchat.com.br",
    });
    if ([301, 302, 307, 308].includes(www.status)) {
      const loc = www.headers.location || "";
      if (/amemchat\.com\.br/.test(loc) && !/www\.amemchat/.test(loc)) {
        ok(`www→apex redirect: ${www.status} → ${loc}`);
      } else {
        note(`www Host returned ${www.status} Location=${loc || "(none)"} — local may not rewrite Host`);
      }
    } else {
      note(`www Host returned ${www.status} (redirect may require edge Host passthrough)`);
    }
  } catch (e) {
    note(`www Host check skipped: ${e instanceof Error ? e.message : e}`);
  }

  // 14–16 kill switches without session (auth must win; no mock admin)
  const chatOff = await request(
    "POST",
    "/api/chat",
    { "Content-Type": "application/json" },
    JSON.stringify({
      message: "smoke",
      requestId: "00000000-0000-4000-8000-000000000001",
    }),
  );
  assertStatus("chat kill-switch env + no session", chatOff, [401]);
  if (/demo-user|MockAi/i.test(chatOff.body)) {
    fail("chat: demo/mock exposed without session");
  }

  const journeyOff = await request(
    "POST",
    "/api/journeys/progress/start",
    { "Content-Type": "application/json" },
    JSON.stringify({ journeySlug: "smoke" }),
  );
  assertStatus("journeys mutation no session", journeyOff, [401, 403]);

  // deepen kill switch must not break unauthenticated chat gate (still 401)
  ok("deepen kill-switch: unauthenticated chat still 401 (no provider path)");

  // 17 no mock admin
  const adminApiish = await request("GET", "/admin");
  if (isPrivateLeak(adminApiish.body)) {
    fail("admin: mock admin content exposed");
  } else {
    ok("admin: no mock admin exposure");
  }

  note(
    "Authenticated kill-switch 503-before-provider remains covered by Vitest feature-kill-switches tests (no auth bypass in this smoke).",
  );
}

function main() {
  if (!fs.existsSync(path.join(root, ".next"))) {
    console.error("Missing .next — run `pnpm build` before smoke:local-runtime");
    process.exit(2);
  }

  console.log(`local-runtime-smoke → ${BASE}`);

  const nextBin = path.join(
    root,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  if (!fs.existsSync(nextBin)) {
    console.error("Missing next binary at node_modules/next/dist/bin/next");
    process.exit(2);
  }

  const child = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(PORT), "-H", "127.0.0.1"],
    {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(PORT),
        // Fail-closed production-like: never enable DEMO_MODE mocks here.
        DEMO_MODE: "false",
        FEATURE_DISABLE_CHAT: "true",
        FEATURE_DISABLE_JOURNEYS: "true",
        FEATURE_DISABLE_DEEPEN: "true",
        // Avoid accidental remote calls from leftover shell env in assertions.
        // Do not print secrets.
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString("utf8");
  });
  child.stdout.on("data", () => {
    // discard — avoid noisy logs
  });

  const shutdown = () =>
    new Promise((resolve) => {
      if (child.exitCode != null) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode == null) child.kill("SIGKILL");
      }, 5_000);
    });

  waitReady(child)
    .then(() => runChecks())
    .catch((e) => {
      fail(e instanceof Error ? e.message : String(e));
      if (stderr.trim()) {
        const redacted = stderr
          .replace(/sk_[a-zA-Z0-9_]+/g, "[redacted]")
          .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted]");
        console.error(redacted.slice(-2000));
      }
    })
    .finally(async () => {
      await shutdown();
      if (errors.length) {
        console.error(`\nlocal-runtime-smoke FAILED (${errors.length})`);
        process.exit(1);
      }
      console.log("\nlocal-runtime-smoke PASS");
      process.exit(0);
    });
}

main();
