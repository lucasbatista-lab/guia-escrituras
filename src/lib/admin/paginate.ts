import "server-only";

import { AppError } from "@/lib/safety";

/** Default PostgREST-safe page size (at/under silent truncation threshold). */
export const ADMIN_QUERY_PAGE_SIZE = 1000;

/**
 * Enough pages for several tens of thousands of rows.
 * Callers treat `partial: true` as incomplete when this cap is hit.
 */
export const ADMIN_QUERY_MAX_PAGES = 100;

export async function fetchAllRowsPaginated<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {},
): Promise<{ rows: T[]; partial: boolean; pagesRead: number }> {
  const pageSize = options.pageSize ?? ADMIN_QUERY_PAGE_SIZE;
  const maxPages = options.maxPages ?? ADMIN_QUERY_MAX_PAGES;
  const rows: T[] = [];
  let from = 0;
  let pagesRead = 0;
  let partial = false;

  while (pagesRead < maxPages) {
    const { data, error } = await Promise.resolve(
      fetchPage(from, from + pageSize - 1),
    );
    if (error) {
      throw new AppError("admin_query_failed", "admin_query_failed", 500);
    }
    const page = data ?? [];
    pagesRead += 1;
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
    if (pagesRead >= maxPages) {
      partial = true;
      break;
    }
  }

  return { rows, partial, pagesRead };
}

export async function collectColumnPaginated<TRow, TValue>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: TRow[] | null; error: { message?: string } | null }>,
  pick: (row: TRow) => TValue | null | undefined,
  options?: { pageSize?: number; maxPages?: number },
): Promise<{ values: TValue[]; partial: boolean }> {
  const { rows, partial } = await fetchAllRowsPaginated(fetchPage, options);
  const values: TValue[] = [];
  for (const row of rows) {
    const value = pick(row);
    if (value != null) values.push(value);
  }
  return { values, partial };
}

/** Intersect restriction sets; null means unrestricted. */
export function intersectIdSets(
  current: Set<string> | null,
  next: Iterable<string>,
): Set<string> {
  const incoming = next instanceof Set ? next : new Set(next);
  if (current == null) return new Set(incoming);
  const out = new Set<string>();
  for (const id of current) {
    if (incoming.has(id)) out.add(id);
  }
  return out;
}

export function paginateSortedIds(
  ids: string[],
  page: number,
  pageSize: number,
): { pageIds: string[]; total: number } {
  const total = ids.length;
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    total,
    pageIds: ids.slice(start, start + pageSize),
  };
}
