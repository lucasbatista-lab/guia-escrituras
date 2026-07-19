/**
 * Daily report calendar helpers — always UTC.
 * Cron runs after UTC midnight and processes the previous complete UTC day.
 */

export const REPORT_TIMEZONE = "UTC" as const;

/** Max inclusive days for admin backfill (defensive hard cap). */
export const DAILY_REPORT_BACKFILL_MAX_DAYS = 31;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Complete previous UTC calendar day relative to `now`. */
export function yesterdayUtcDate(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - 1);
  return formatUtcDate(d);
}

export function todayUtcDate(now = new Date()): string {
  return formatUtcDate(now);
}

export function parseReportDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const match = DATE_RE.exec(trimmed);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return formatUtcDate(probe);
}

export function isFutureUtcDate(date: string, now = new Date()): boolean {
  return date > todayUtcDate(now);
}

export function isTodayOrFutureUtcDate(date: string, now = new Date()): boolean {
  return date >= todayUtcDate(now);
}

/** Inclusive UTC day range; rejects inverted ranges and oversized spans. */
export function enumerateUtcDatesInclusive(
  fromDate: string,
  toDate: string,
  maxDays = DAILY_REPORT_BACKFILL_MAX_DAYS,
): { ok: true; dates: string[] } | { ok: false; code: string; message: string } {
  const from = parseReportDate(fromDate);
  const to = parseReportDate(toDate);
  if (!from || !to) {
    return {
      ok: false,
      code: "invalid_date",
      message: "Informe datas no formato YYYY-MM-DD.",
    };
  }
  if (from > to) {
    return {
      ok: false,
      code: "invalid_range",
      message: "A data inicial deve ser anterior ou igual à final.",
    };
  }

  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatUtcDate(cursor));
    if (dates.length > maxDays) {
      return {
        ok: false,
        code: "range_too_large",
        message: `O backfill permite no máximo ${maxDays} dias.`,
      };
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { ok: true, dates };
}

export function utcDayBounds(date: string): {
  startIso: string;
  endIso: string;
} {
  const parsed = parseReportDate(date);
  if (!parsed) {
    throw new Error("invalid_report_date");
  }
  const start = new Date(`${parsed}T00:00:00.000Z`);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
