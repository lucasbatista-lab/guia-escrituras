import "server-only";

/**
 * WhatsApp channel configuration (server-only).
 *
 * WHATSAPP_CHANNEL_ENABLED defaults OFF:
 * - unset / empty / false / 0 / off / no → disabled
 * - true / 1 / yes / on → enabled
 * - any other non-empty value → disabled (fail-closed)
 *
 * Presence of Meta credentials never auto-enables the channel.
 */

export const WHATSAPP_ENV_KEYS = {
  enabled: "WHATSAPP_CHANNEL_ENABLED",
  verifyToken: "WHATSAPP_VERIFY_TOKEN",
  appSecret: "WHATSAPP_APP_SECRET",
  accessToken: "WHATSAPP_ACCESS_TOKEN",
  phoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
} as const;

/** Inbound text hard cap (aligns with chat message max). */
export const WHATSAPP_INBOUND_TEXT_MAX = 4000;

/** Conservative outbound budget under WhatsApp 4096 limit. */
export const WHATSAPP_OUTBOUND_TEXT_MAX = 3500;

/** Default debounce window for fragmented inbound messages. */
export const WHATSAPP_DEBOUNCE_MS_DEFAULT = 3000;

export const WHATSAPP_DEBOUNCE_MS_MIN = 2000;
export const WHATSAPP_DEBOUNCE_MS_MAX = 4000;

function truthyEnable(raw: string | undefined): boolean {
  if (raw == null || raw.trim() === "") return false;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  return false;
}

export function isWhatsAppChannelEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return truthyEnable(env[WHATSAPP_ENV_KEYS.enabled]);
}

export function getWhatsAppVerifyToken(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.verifyToken]?.trim();
  return raw ? raw : null;
}

export function getWhatsAppAppSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.appSecret]?.trim();
  return raw ? raw : null;
}

/** Names only — never required for inbound foundation tests. */
export function getWhatsAppAccessToken(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.accessToken]?.trim();
  return raw ? raw : null;
}

export function getWhatsAppPhoneNumberId(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.phoneNumberId]?.trim();
  return raw ? raw : null;
}

export function resolveWhatsAppDebounceMs(
  raw: string | number | undefined = process.env.WHATSAPP_DEBOUNCE_MS,
): number {
  const n =
    typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return WHATSAPP_DEBOUNCE_MS_DEFAULT;
  return Math.min(
    WHATSAPP_DEBOUNCE_MS_MAX,
    Math.max(WHATSAPP_DEBOUNCE_MS_MIN, Math.floor(n)),
  );
}
