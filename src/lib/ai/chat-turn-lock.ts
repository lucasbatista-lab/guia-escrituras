/**
 * Process-local single-flight lock for chat turns (same userId + requestId).
 *
 * Prevents duplicate OpenAI calls when two requests with the same requestId
 * hit the same instance concurrently. Does not coordinate across serverless
 * instances — that would need a DB lease (migration). Unique indexes still
 * prevent duplicate message/usage rows across instances.
 */

export type ChatTurnLockHandle = {
  key: string;
  release: () => void;
};

const inflight = new Map<string, number>();

export function chatTurnLockKey(userId: string, requestId: string): string {
  return `${userId}:${requestId}`;
}

export function getChatTurnInFlightLeaseMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number(env.CHAT_TURN_IN_FLIGHT_MS ?? "90000");
  if (!Number.isFinite(raw) || raw < 5_000) return 90_000;
  if (raw > 300_000) return 300_000;
  return raw;
}

/**
 * Try to acquire a soft lease. Stale entries older than leaseMs are stolen
 * so a crashed worker cannot block retries forever within this process.
 */
export function tryAcquireChatTurnLock(
  userId: string,
  requestId: string,
  nowMs = Date.now(),
  leaseMs = getChatTurnInFlightLeaseMs(),
): ChatTurnLockHandle | null {
  const key = chatTurnLockKey(userId, requestId);
  const heldSince = inflight.get(key);
  if (heldSince != null && nowMs - heldSince < leaseMs) {
    return null;
  }
  inflight.set(key, nowMs);
  return {
    key,
    release: () => {
      if (inflight.get(key) === nowMs) {
        inflight.delete(key);
      }
    },
  };
}

/** Test helper — clears process-local state. */
export function resetChatTurnLocksForTests(): void {
  inflight.clear();
}
