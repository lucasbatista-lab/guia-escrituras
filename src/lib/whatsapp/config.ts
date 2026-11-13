import "server-only";

/**
 * WhatsApp channel configuration (server-only).
 *
 * WHATSAPP_CHANNEL_ENABLED / WHATSAPP_OUTBOUND_ENABLED default OFF:
 * - unset / empty / false / 0 / off / no → disabled
 * - true / 1 / yes / on → enabled
 * - any other non-empty value → disabled (fail-closed)
 *
 * Presence of Meta credentials never auto-enables the channel or outbound.
 */

export const WHATSAPP_ENV_KEYS = {
  enabled: "WHATSAPP_CHANNEL_ENABLED",
  outboundEnabled: "WHATSAPP_OUTBOUND_ENABLED",
  verifyToken: "WHATSAPP_VERIFY_TOKEN",
  appSecret: "WHATSAPP_APP_SECRET",
  accessToken: "WHATSAPP_ACCESS_TOKEN",
  phoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
  graphApiVersion: "WHATSAPP_GRAPH_API_VERSION",
  linkTokenSecret: "WHATSAPP_LINK_TOKEN_SECRET",
  workerSecret: "WHATSAPP_WORKER_SECRET",
  outboundWorkerSecret: "WHATSAPP_OUTBOUND_WORKER_SECRET",
} as const;

/** Fixed Graph API host — never overridden by env. */
export const WHATSAPP_GRAPH_API_BASE_URL = "https://graph.facebook.com";

/** Inbound text hard cap (aligns with chat message max). */
export const WHATSAPP_INBOUND_TEXT_MAX = 4000;

/** Conservative outbound budget under WhatsApp 4096 limit. */
export const WHATSAPP_OUTBOUND_TEXT_MAX = 3500;

/** Default debounce window for fragmented inbound messages. */
export const WHATSAPP_DEBOUNCE_MS_DEFAULT = 3000;

export const WHATSAPP_DEBOUNCE_MS_MIN = 2000;
export const WHATSAPP_DEBOUNCE_MS_MAX = 4000;

/** Outbound worker defaults. */
export const WHATSAPP_OUTBOUND_BATCH_DEFAULT = 5;
export const WHATSAPP_OUTBOUND_BATCH_MAX = 20;
export const WHATSAPP_OUTBOUND_LEASE_SECONDS = 90;
export const WHATSAPP_OUTBOUND_MAX_ATTEMPTS = 8;
export const WHATSAPP_OUTBOUND_TIMEOUT_MS = 12_000;
export const WHATSAPP_OUTBOUND_BACKOFF_MAX_SECONDS = 300;

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

/** Independent outbound flag — never sufficient alone for send. */
export function isWhatsAppOutboundEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return truthyEnable(env[WHATSAPP_ENV_KEYS.outboundEnabled]);
}

/**
 * Outbound send requires BOTH channel + outbound flags.
 * Credentials alone never enable sending.
 */
export function isWhatsAppOutboundSendAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isWhatsAppChannelEnabled(env) && isWhatsAppOutboundEnabled(env);
}

export function getWhatsAppVerifyToken(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.verifyToken]?.trim();
  return raw ? raw : null;
}

export function getWhatsAppAppSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.appSecret]?.trim();
  return raw ? raw : null;
}

/** Access token — presence only; never log/return value in callers. */
export function getWhatsAppAccessToken(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.accessToken]?.trim();
  if (!raw || raw.length < 20) return null;
  return raw;
}

/** Phone number ID (Meta asset id — digits), not a phone number. */
export function getWhatsAppPhoneNumberId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.phoneNumberId]?.trim();
  if (!raw || !/^\d{5,30}$/.test(raw)) return null;
  return raw;
}

/** Strict Graph API version: vNN.N */
export function getWhatsAppGraphApiVersion(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.graphApiVersion]?.trim();
  if (!raw) return null;
  if (!/^v\d{2}\.\d$/.test(raw)) return null;
  if (raw.includes("/") || raw.includes("?") || raw.includes(":")) return null;
  return raw;
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

/** Link-token HMAC secret — fail closed if missing or too short. */
export function getWhatsAppLinkTokenSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.linkTokenSecret]?.trim();
  if (!raw || raw.length < 32) return null;
  return raw;
}

/** Internal inbound worker auth secret — fail closed if missing or too short. */
export function getWhatsAppWorkerSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.workerSecret]?.trim();
  if (!raw || raw.length < 32) return null;
  return raw;
}

/** Separate outbound worker secret — fail closed if missing or too short. */
export function getWhatsAppOutboundWorkerSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[WHATSAPP_ENV_KEYS.outboundWorkerSecret]?.trim();
  if (!raw || raw.length < 32) return null;
  return raw;
}

export type OutboundConfigResult =
  | {
      ok: true;
      accessToken: string;
      phoneNumberId: string;
      graphApiVersion: string;
    }
  | { ok: false; code: "meta_configuration_error" };

/** Resolve outbound Graph credentials — fail closed; never logs secrets. */
export function resolveWhatsAppOutboundConfig(
  env: Record<string, string | undefined> = process.env,
): OutboundConfigResult {
  const accessToken = getWhatsAppAccessToken(env);
  const phoneNumberId = getWhatsAppPhoneNumberId(env);
  const graphApiVersion = getWhatsAppGraphApiVersion(env);
  if (!accessToken || !phoneNumberId || !graphApiVersion) {
    return { ok: false, code: "meta_configuration_error" };
  }
  return { ok: true, accessToken, phoneNumberId, graphApiVersion };
}
