import { writeFileSync } from "node:fs";
import { isDailyCheckinValue } from "../checkin";
import { isIsoCalendarDate, addCalendarDays, brtCalendarDate } from "../timezone";
import type { DailyContent, DailyContentStatus } from "../types";

/** Empty allowlist: V1 rejects any non-empty scripture_text (no licensed corpus). */
export const ALLOWED_SCRIPTURE_TRANSLATIONS: readonly string[] = [];

export const DAILY_IMPORT_MAX_LEN = {
  title: 120,
  theme: 80,
  paraphrase: 800,
  reflection: 2000,
  prayer: 1200,
  action: 500,
  shareText: 500,
  scriptureText: 4000,
} as const;

export type DailyImportRecord = {
  day_index?: number;
  publish_date: string;
  theme: string;
  title: string;
  scripture_book: string;
  scripture_chapter: number;
  scripture_start_verse: number;
  scripture_end_verse?: number | null;
  scripture_translation?: string | null;
  scripture_text?: string | null;
  scripture_paraphrase: string;
  reflection: string;
  prayer: string;
  action: string;
  share_text?: string | null;
  related_checkin?: string | null;
  premium_cta?: string | null;
  review_status?: string | null;
  status?: DailyContentStatus;
};

export type DailyValidationIssue = {
  index: number;
  field: string;
  message: string;
};

export function parseDailyImportFile(raw: string): {
  records: DailyImportRecord[];
  issues: DailyValidationIssue[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      records: [],
      issues: [{ index: -1, field: "file", message: "JSON inválido." }],
    };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;
  if (!list) {
    return {
      records: [],
      issues: [
        {
          index: -1,
          field: "file",
          message: "Esperado um array JSON ou { items: [] }.",
        },
      ],
    };
  }
  return { records: list as DailyImportRecord[], issues: [] };
}

export function validateDailyImportRecords(
  records: DailyImportRecord[],
): DailyValidationIssue[] {
  const issues: DailyValidationIssue[] = [];
  const dates = new Map<string, number>();

  records.forEach((row, index) => {
    const date = String(row.publish_date ?? "").trim();
    if (!isIsoCalendarDate(date)) {
      issues.push({ index, field: "publish_date", message: "Data inválida." });
    } else if (dates.has(date)) {
      issues.push({
        index,
        field: "publish_date",
        message: `Data duplicada (${date}).`,
      });
    } else {
      dates.set(date, index);
    }

    if (!String(row.theme ?? "").trim()) {
      issues.push({ index, field: "theme", message: "Tema ausente." });
    }
    if (!String(row.title ?? "").trim()) {
      issues.push({ index, field: "title", message: "Título ausente." });
    }
    if (!String(row.scripture_book ?? "").trim()) {
      issues.push({
        index,
        field: "scripture_book",
        message: "Livro bíblico ausente.",
      });
    }
    if (!Number.isInteger(row.scripture_chapter) || row.scripture_chapter < 1) {
      issues.push({
        index,
        field: "scripture_chapter",
        message: "Capítulo inválido.",
      });
    }
    if (
      !Number.isInteger(row.scripture_start_verse) ||
      row.scripture_start_verse < 1
    ) {
      issues.push({
        index,
        field: "scripture_start_verse",
        message: "Versículo inicial inválido.",
      });
    }
    if (!String(row.scripture_paraphrase ?? "").trim()) {
      issues.push({
        index,
        field: "scripture_paraphrase",
        message: "Paráfrase ausente.",
      });
    }
    if (!String(row.reflection ?? "").trim()) {
      issues.push({ index, field: "reflection", message: "Reflexão ausente." });
    }
    if (!String(row.prayer ?? "").trim()) {
      issues.push({ index, field: "prayer", message: "Oração ausente." });
    }
    if (!String(row.action ?? "").trim()) {
      issues.push({ index, field: "action", message: "Ação ausente." });
    }

    const status = row.status ?? "published";
    if (status !== "published" && status !== "draft") {
      issues.push({ index, field: "status", message: "Status inválido." });
    }
    if (
      row.related_checkin &&
      !isDailyCheckinValue(String(row.related_checkin))
    ) {
      issues.push({
        index,
        field: "related_checkin",
        message: "Check-in relacionado inválido.",
      });
    }

    const fieldMap: Record<string, string> = {
      paraphrase: "scripture_paraphrase",
      scriptureText: "scripture_text",
      shareText: "share_text",
    };
    for (const [field, max] of Object.entries(DAILY_IMPORT_MAX_LEN)) {
      const key = fieldMap[field] ?? field;
      const value = String((row as Record<string, unknown>)[key] ?? "");
      if (value.length > max) {
        issues.push({
          index,
          field: key,
          message: `Texto excede ${max} caracteres.`,
        });
      }
    }

    const scriptureText = String(row.scripture_text ?? "").trim();
    if (scriptureText) {
      const translation = String(row.scripture_translation ?? "").trim();
      if (
        !translation ||
        !ALLOWED_SCRIPTURE_TRANSLATIONS.includes(translation)
      ) {
        issues.push({
          index,
          field: "scripture_text",
          message:
            "scripture_text rejeitado: sem tradução na allowlist jurídica (use só referência + paráfrase).",
        });
      }
    }
  });

  return issues;
}

export function toDailyContent(row: DailyImportRecord): DailyContent {
  const end = row.scripture_end_verse ?? null;
  const ref =
    end && end !== row.scripture_start_verse
      ? `${row.scripture_book} ${row.scripture_chapter}:${row.scripture_start_verse}-${end}`
      : `${row.scripture_book} ${row.scripture_chapter}:${row.scripture_start_verse}`;
  return {
    id: `editorial-${row.publish_date}`,
    publishDate: row.publish_date,
    theme: row.theme.trim(),
    title: row.title.trim(),
    scriptureBook: row.scripture_book.trim(),
    scriptureChapter: row.scripture_chapter,
    scriptureStartVerse: row.scripture_start_verse,
    scriptureEndVerse: end,
    translationId: row.scripture_translation?.trim() || null,
    scriptureText: null,
    scriptureReference: ref,
    paraphrase: row.scripture_paraphrase.trim(),
    reflection: row.reflection.trim(),
    prayer: row.prayer.trim(),
    action: row.action.trim(),
    status: row.status === "draft" ? "draft" : "published",
  };
}

export function mergeDailyCatalog(
  existing: DailyContent[],
  incoming: DailyContent[],
): DailyContent[] {
  const byDate = new Map<string, DailyContent>();
  for (const item of existing) {
    if (item.publishDate) byDate.set(item.publishDate, item);
  }
  for (const item of incoming) {
    if (item.publishDate) byDate.set(item.publishDate, item);
  }
  return [...byDate.values()].sort((a, b) =>
    (a.publishDate ?? "").localeCompare(b.publishDate ?? ""),
  );
}

export function writeDailyCatalog(
  path: string,
  items: DailyContent[],
  dryRun: boolean,
): { written: boolean; count: number } {
  if (dryRun) return { written: false, count: items.length };
  writeFileSync(path, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  return { written: true, count: items.length };
}

export function dailyCoverageReport(
  datedItems: DailyContent[],
  today = brtCalendarDate(),
  lookAheadDays = 14,
): {
  today: string;
  publishedThrough: string | null;
  missingDates: string[];
  datedCount: number;
} {
  const published = datedItems.filter(
    (item) => item.status === "published" && item.publishDate,
  );
  const dates = new Set(published.map((item) => item.publishDate as string));
  const sorted = [...dates].sort();
  const missing: string[] = [];
  for (let i = 0; i < lookAheadDays; i += 1) {
    const day = addCalendarDays(today, i);
    if (!dates.has(day)) missing.push(day);
  }
  return {
    today,
    publishedThrough: sorted.at(-1) ?? null,
    missingDates: missing,
    datedCount: dates.size,
  };
}
