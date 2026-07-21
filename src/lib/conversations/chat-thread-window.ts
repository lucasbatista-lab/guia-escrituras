/** Max messages loaded into /conversar for an existing thread (newest first). */
export const CHAT_THREAD_LOAD_LIMIT = 200;

/**
 * True when the loaded page is full — older turns may exist but are not shown.
 * Pure helper for notices; does not fetch.
 */
export function chatThreadMayBeTruncated(
  loadedCount: number,
  limit = CHAT_THREAD_LOAD_LIMIT,
): boolean {
  return loadedCount >= limit;
}
