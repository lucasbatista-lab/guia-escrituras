#!/usr/bin/env node
/**
 * Daily editorial pipeline (no secrets, no LLM, no licensed Bible corpus).
 *
 *   node scripts/content-daily.cjs validate --file path.json
 *   node scripts/content-daily.cjs import --file path.json [--dry-run]
 *   node scripts/content-daily.cjs coverage
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const CATALOG_PATH = path.join(
  __dirname,
  "..",
  "src",
  "lib",
  "daily",
  "editorial",
  "imported.json",
);

const MAX = {
  title: 120,
  theme: 80,
  scripture_paraphrase: 800,
  reflection: 2000,
  prayer: 1200,
  action: 500,
  share_text: 500,
  scripture_text: 4000,
};

function arg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function brtToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function parseFile(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  throw new Error("Esperado um array JSON ou { items: [] }.");
}

function validate(records) {
  const issues = [];
  const dates = new Map();
  records.forEach((row, index) => {
    const date = String(row.publish_date || "").trim();
    if (!isIsoDate(date)) issues.push({ index, field: "publish_date", message: "Data inválida." });
    else if (dates.has(date)) issues.push({ index, field: "publish_date", message: `Data duplicada (${date}).` });
    else dates.set(date, index);
    for (const field of ["theme", "title", "scripture_book", "scripture_paraphrase", "reflection", "prayer", "action"]) {
      if (!String(row[field] || "").trim()) issues.push({ index, field, message: "Campo obrigatório ausente." });
    }
    if (!Number.isInteger(row.scripture_chapter) || row.scripture_chapter < 1) {
      issues.push({ index, field: "scripture_chapter", message: "Capítulo inválido." });
    }
    if (!Number.isInteger(row.scripture_start_verse) || row.scripture_start_verse < 1) {
      issues.push({ index, field: "scripture_start_verse", message: "Versículo inválido." });
    }
    const status = row.status || "published";
    if (status !== "published" && status !== "draft") {
      issues.push({ index, field: "status", message: "Status inválido." });
    }
    const checkin = row.related_checkin;
    if (
      checkin &&
      !["grateful", "peaceful", "anxious", "tired", "lost", "hopeful"].includes(
        String(checkin),
      )
    ) {
      issues.push({ index, field: "related_checkin", message: "Check-in inválido." });
    }
    for (const [field, max] of Object.entries(MAX)) {
      const value = String(row[field] || "");
      if (value.length > max) issues.push({ index, field, message: `Excede ${max} caracteres.` });
    }
    if (String(row.scripture_text || "").trim()) {
      issues.push({
        index,
        field: "scripture_text",
        message: "scripture_text rejeitado: use referência + paráfrase (allowlist jurídica vazia).",
      });
    }
  });
  return issues;
}

function toContent(row) {
  const end = row.scripture_end_verse ?? null;
  const ref =
    end && end !== row.scripture_start_verse
      ? `${row.scripture_book} ${row.scripture_chapter}:${row.scripture_start_verse}-${end}`
      : `${row.scripture_book} ${row.scripture_chapter}:${row.scripture_start_verse}`;
  return {
    id: `editorial-${row.publish_date}`,
    publishDate: row.publish_date,
    theme: String(row.theme).trim(),
    title: String(row.title).trim(),
    scriptureBook: String(row.scripture_book).trim(),
    scriptureChapter: row.scripture_chapter,
    scriptureStartVerse: row.scripture_start_verse,
    scriptureEndVerse: end,
    translationId: null,
    scriptureText: null,
    scriptureReference: ref,
    paraphrase: String(row.scripture_paraphrase).trim(),
    reflection: String(row.reflection).trim(),
    prayer: String(row.prayer).trim(),
    action: String(row.action).trim(),
    status: row.status === "draft" ? "draft" : "published",
  };
}

function cmdValidate(file) {
  const records = parseFile(fs.readFileSync(file, "utf8"));
  const issues = validate(records);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, issues }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, count: records.length }, null, 2));
}

function cmdImport(file, dryRun) {
  const records = parseFile(fs.readFileSync(file, "utf8"));
  const issues = validate(records);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, issues }, null, 2));
    process.exit(1);
  }
  const existing = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const byDate = new Map();
  for (const item of existing) {
    if (item.publishDate) byDate.set(item.publishDate, item);
  }
  for (const row of records) {
    const item = toContent(row);
    byDate.set(item.publishDate, item);
  }
  const merged = [...byDate.values()].sort((a, b) =>
    String(a.publishDate).localeCompare(String(b.publishDate)),
  );
  if (!dryRun) {
    fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  }
  console.log(
    JSON.stringify(
      { ok: true, dryRun, count: merged.length, catalog: path.relative(process.cwd(), CATALOG_PATH) },
      null,
      2,
    ),
  );
}

function cmdCoverage() {
  const today = brtToday();
  const imported = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const dates = new Set(
    imported.filter((i) => i.status === "published" && i.publishDate).map((i) => i.publishDate),
  );
  const missing = [];
  for (let i = 0; i < 14; i += 1) {
    const day = addDays(today, i);
    if (!dates.has(day)) missing.push(day);
  }
  const sorted = [...dates].sort();
  console.log(`Today: ${today} BRT`);
  console.log(`Imported dated catalog: ${dates.size} day(s)`);
  console.log(`Published/ready through: ${sorted.at(-1) || "(none — QA seed cycles as fallback)"}`);
  console.log(`Missing dates (next 14): ${missing.length ? missing.join(", ") : "none"}`);
  console.log("Note: seed fixtures still fill empty dates by weekday cycle so Hoje never renders blank.");
}

function main() {
  const cmd = process.argv[2];
  const file = arg("file");
  if (cmd === "validate") {
    if (!file) {
      console.error("Usage: node scripts/content-daily.cjs validate --file <path>");
      process.exit(1);
    }
    cmdValidate(file);
    return;
  }
  if (cmd === "import") {
    if (!file) {
      console.error("Usage: node scripts/content-daily.cjs import --file <path> [--dry-run]");
      process.exit(1);
    }
    cmdImport(file, hasFlag("dry-run"));
    return;
  }
  if (cmd === "coverage") {
    cmdCoverage();
    return;
  }
  console.error("Usage: node scripts/content-daily.cjs <validate|import|coverage> [--file path] [--dry-run]");
  process.exit(1);
}

main();
