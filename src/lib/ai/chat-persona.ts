import { getTraditionPolicy } from "@/lib/theology/traditions";
import { listAvailablePersonas } from "@/lib/theology/personas";
import type { TraditionKey } from "@/lib/theology/types";

export const DEFAULT_CHAT_PERSONA_KEY = "jesus";
export const MAX_CHAT_PERSONA_KEY_LENGTH = 32;

/**
 * Authorize personaKey against active personas + tradition/saints policy.
 * Never trusts the client beyond an allowlist — unavailable keys fall back
 * to the default mentor persona (jesus).
 */
export function resolveAuthorizedPersonaKey(input: {
  requested: string | null | undefined;
  traditionKey: TraditionKey;
  saintsContentEnabled: boolean;
}): { personaKey: string; fellBack: boolean } {
  const requested = (input.requested ?? DEFAULT_CHAT_PERSONA_KEY).trim();
  if (
    !requested ||
    requested.length > MAX_CHAT_PERSONA_KEY_LENGTH ||
    !/^[a-z][a-z0-9_-]*$/i.test(requested)
  ) {
    return { personaKey: DEFAULT_CHAT_PERSONA_KEY, fellBack: true };
  }

  const tradition = getTraditionPolicy(input.traditionKey);
  const available = listAvailablePersonas({
    traditionKey: input.traditionKey,
    saintsContentEnabled: input.saintsContentEnabled,
    allowsSaintsContent: tradition?.allowsSaintsContent ?? false,
  });

  if (available.some((p) => p.key === requested)) {
    return { personaKey: requested, fellBack: false };
  }

  return { personaKey: DEFAULT_CHAT_PERSONA_KEY, fellBack: true };
}
