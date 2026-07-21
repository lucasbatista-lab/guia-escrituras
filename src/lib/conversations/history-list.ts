/**
 * History list helpers for /conversas retention UX.
 * Pure functions — no DB, no OpenAI, no spiritual inference.
 */

export const HISTORY_LIST_DEFAULT_LIMIT = 30;
export const HISTORY_LIST_EXPANDED_LIMIT = 60;
export const HISTORY_LIST_HARD_CAP = 60;
export const HISTORY_PREVIEW_FETCH_CAP = 8;

export type HistoryPeriodKey = "today" | "yesterday" | "week" | "older";

export type HistoryListItem = {
  id: string;
  title: string | null;
  updatedAt: string;
  preview: string | null;
};

export type HistoryPeriodGroup = {
  key: HistoryPeriodKey;
  label: string;
  items: HistoryListItem[];
};

const PERIOD_ORDER: HistoryPeriodKey[] = [
  "today",
  "yesterday",
  "week",
  "older",
];

const PERIOD_LABELS: Record<HistoryPeriodKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Esta semana",
  older: "Anteriores",
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function resolveHistoryListLimit(maisParam: string | undefined): {
  limit: number;
  expanded: boolean;
} {
  const expanded = maisParam === "1" || maisParam === "true";
  const limit = expanded
    ? HISTORY_LIST_EXPANDED_LIMIT
    : HISTORY_LIST_DEFAULT_LIMIT;
  return {
    limit: Math.min(limit, HISTORY_LIST_HARD_CAP),
    expanded,
  };
}

export function conversationHistoryPeriod(
  iso: string,
  now = new Date(),
): HistoryPeriodKey {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "older";

  if (isSameLocalDay(date, now)) return "today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return "yesterday";

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return "week";
  return "older";
}

export function groupConversationsByPeriod(
  items: HistoryListItem[],
  now = new Date(),
): HistoryPeriodGroup[] {
  const buckets = new Map<HistoryPeriodKey, HistoryListItem[]>();
  for (const key of PERIOD_ORDER) buckets.set(key, []);

  for (const item of items) {
    const key = conversationHistoryPeriod(item.updatedAt, now);
    buckets.get(key)!.push(item);
  }

  return PERIOD_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (key) => ({
      key,
      label: PERIOD_LABELS[key],
      items: buckets.get(key)!,
    }),
  );
}

/** Case-insensitive filter over title + preview (already sanitized snippets). */
export function filterHistoryItems(
  items: HistoryListItem[],
  query: string,
): HistoryListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const title = (item.title ?? "").toLowerCase();
    const preview = (item.preview ?? "").toLowerCase();
    return title.includes(q) || preview.includes(q);
  });
}
