/**
 * In-process rate limit for WhatsApp link-code generation.
 * Conservative defaults; fails closed when exceeded.
 */

export type LinkRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export function evaluateWhatsAppLinkCodeRateLimit(
  userId: string,
  nowMs = Date.now(),
): LinkRateLimitResult {
  if (!userId) return { allowed: false, retryAfterSeconds: WINDOW_MS / 1000 };
  const bucket = buckets.get(userId) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => nowMs - t < WINDOW_MS);
  if (bucket.timestamps.length >= MAX_PER_WINDOW) {
    const oldest = bucket.timestamps[0]!;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (nowMs - oldest)) / 1000),
    );
    buckets.set(userId, bucket);
    return { allowed: false, retryAfterSeconds };
  }
  bucket.timestamps.push(nowMs);
  buckets.set(userId, bucket);
  return { allowed: true };
}

/** Test helper — clear buckets between cases. */
export function resetWhatsAppLinkCodeRateLimit(): void {
  buckets.clear();
}
