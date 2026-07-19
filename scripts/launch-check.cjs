/**
 * Static launch readiness checks — no network, no secret values printed.
 *
 * Usage: node scripts/launch-check.cjs
 * Exit 0 = ok; non-zero = blocking findings.
 */

const fs = require("node:fs");
const path = require("node:path");
const { ENV_MATRIX } = require("./launch-env-matrix.cjs");

const root = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

const requiredDocs = [
  "docs/PRODUCTION_CUTOVER_RUNBOOK.md",
  "docs/LAUNCH_CHECKLIST.md",
  "docs/DEPLOYMENT.md",
  "docs/DAILY_REPORTS.md",
  "docs/ARCHITECTURE.md",
  "docs/NEXT_STEPS.md",
  ".env.example",
  "vercel.json",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
];

for (const rel of requiredDocs) {
  if (!exists(rel)) fail(`missing required file: ${rel}`);
}

if (exists("vercel.json")) {
  const vercel = JSON.parse(read("vercel.json"));
  const cron = (vercel.crons || []).find(
    (c) => c.path === "/api/cron/daily-report",
  );
  if (!cron) fail("vercel.json missing cron /api/cron/daily-report");
  else if (cron.schedule !== "15 0 * * *") {
    fail(`unexpected cron schedule: ${cron.schedule}`);
  }
}

const envExample = read(".env.example");
for (const row of ENV_MATRIX) {
  if (row.production === "required" || row.production === "recommended") {
    if (
      row.name === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
      row.name === "SUPABASE_SERVICE_ROLE_KEY"
    ) {
      continue;
    }
    if (!envExample.includes(`${row.name}=`)) {
      fail(`.env.example missing name ${row.name}=`);
    }
  }
  const line = envExample
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${row.name}=`));
  if (line) {
    const value = line.slice(row.name.length + 1).trim();
    if (
      /^(sk_live_|sk_test_|whsec_|sb_secret_|eyJ)/.test(value) ||
      (row.sensitive && value.length > 8)
    ) {
      fail(`.env.example must not contain a real value for ${row.name}`);
    }
  }
}

for (const row of ENV_MATRIX) {
  if (row.sensitive && row.name.startsWith("NEXT_PUBLIC_")) {
    fail(`sensitive env incorrectly marked public: ${row.name}`);
  }
  if (row.sensitive && row.visibility !== "server") {
    fail(`sensitive env must be server-only: ${row.name}`);
  }
}

if (envExample.includes("NEXT_PUBLIC_CRON_SECRET")) {
  fail("CRON_SECRET must never be NEXT_PUBLIC_");
}
if (envExample.includes("NEXT_PUBLIC_STRIPE_SECRET")) {
  fail("Stripe secret must never be NEXT_PUBLIC_");
}
if (envExample.includes("NEXT_PUBLIC_OPENAI")) {
  fail("OpenAI key must never be NEXT_PUBLIC_");
}
if (envExample.includes("NEXT_PUBLIC_SUPABASE_SECRET")) {
  fail("Supabase secret must never be NEXT_PUBLIC_");
}

const appUrlSrc = read("src/lib/auth/app-url.ts");
if (!appUrlSrc.includes("https://amemchat.com.br")) {
  fail("canonical production origin missing in app-url.ts");
}
if (appUrlSrc.includes("guia-escrituras.vercel.app")) {
  fail("old vercel host must not be canonical default");
}

const brand = read("src/config/brand.ts");
if (/guia-escrituras\.vercel\.app/.test(brand)) {
  fail("brand config references old vercel domain");
}

const robots = read("src/app/robots.ts");
for (const pathPart of ["/admin", "/api", "/conversar", "/conta"]) {
  if (!robots.includes(pathPart)) {
    warn(`robots.ts may not disallow ${pathPart}`);
  }
}

const sitemap = read("src/app/sitemap.ts");
if (!sitemap.includes("/planos")) fail("sitemap.ts missing /planos");

const runbook = read("docs/PRODUCTION_CUTOVER_RUNBOOK.md");
for (const needle of [
  "Pré-deploy",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "migration 004",
  "Rollback",
  "Smoke humano",
  "OPENAI_API_KEY",
]) {
  if (!runbook.toLowerCase().includes(needle.toLowerCase())) {
    fail(`runbook missing section/token: ${needle}`);
  }
}

const checklist = read("docs/LAUNCH_CHECKLIST.md");
if (!checklist.includes("depende de **produção**")) {
  fail("LAUNCH_CHECKLIST must distinguish local vs production");
}
if (/pagamento real controlado\s*\n-\s*\[x\]/i.test(checklist)) {
  fail("checklist must not mark live payment as done");
}
// Legend explains that [x] is local-only; reject claims of remote validation done.
if (/validado em produção\s*[.—-]/i.test(checklist) && /\[x\].{0,40}DNS/i.test(checklist)) {
  fail("checklist must not mark DNS as production-validated");
}
if (
  checklist.includes("validado em produção") &&
  !checklist.includes("já validado em produção")
) {
  fail("checklist must not claim production validation as done");
}

const deployment = read("docs/DEPLOYMENT.md");
const architecture = read("docs/ARCHITECTURE.md");
for (const [name, body] of [
  ["DEPLOYMENT", deployment],
  ["ARCHITECTURE", architecture],
]) {
  if (/admin metrics.*mock/i.test(body)) {
    fail(`${name}.md still describes admin metrics as mock`);
  }
}

if (!deployment.includes("CRON_SECRET")) {
  fail("DEPLOYMENT.md must document CRON_SECRET");
}
if (!deployment.includes("004")) {
  fail("DEPLOYMENT.md must mention migration 004 status");
}

const cronAuth = read("src/lib/reports/cron-auth.ts");
if (!cronAuth.includes("CRON_SECRET")) fail("cron-auth missing CRON_SECRET");
if (cronAuth.includes("NEXT_PUBLIC_CRON")) {
  fail("cron-auth must not use NEXT_PUBLIC_ for cron secret");
}

const matrixNames = new Set(ENV_MATRIX.map((r) => r.name));
for (const name of [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
]) {
  if (!matrixNames.has(name)) fail(`matrix missing used env ${name}`);
}

console.log("launch:check — env matrix (names only)");
for (const row of ENV_MATRIX) {
  console.log(
    `  ${row.name} [${row.visibility}${row.sensitive ? ",sensitive" : ""}] prod=${row.production} preview=${row.preview}`,
  );
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length) {
  console.error("\nlaunch:check FAILED:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  "\nlaunch:check OK (static only; does not validate remote envs or deploy)",
);
process.exit(0);
