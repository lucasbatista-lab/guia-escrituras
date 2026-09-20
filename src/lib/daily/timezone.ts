/** Authoritative product calendar timezone for daily content. */
export const PRODUCT_TIMEZONE = "America/Sao_Paulo" as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar date (YYYY-MM-DD) in America/Sao_Paulo.
 * Uses en-CA so Intl returns ISO-like year-month-day.
 */
export function brtCalendarDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRODUCT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isIsoCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return false;
  const utc = Date.UTC(y, m - 1, d);
  const dt = new Date(utc);
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function addCalendarDays(isoDate: string, days: number): string {
  if (!isIsoCalendarDate(isoDate)) {
    throw new Error("invalid_calendar_date");
  }
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function listRecentCalendarDates(
  todayIso: string,
  count = 7,
): string[] {
  const n = Math.max(1, Math.min(31, count));
  const dates: string[] = [];
  for (let i = 0; i < n; i += 1) {
    dates.push(addCalendarDays(todayIso, -i));
  }
  return dates;
}

/** Whole days since Unix epoch of the given calendar date (UTC midnight of that civil date). */
export function calendarDayIndex(isoDate: string): number {
  if (!isIsoCalendarDate(isoDate)) {
    throw new Error("invalid_calendar_date");
  }
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function formatBrtLongDate(isoDate: string): string {
  if (!isIsoCalendarDate(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(utc);
}
