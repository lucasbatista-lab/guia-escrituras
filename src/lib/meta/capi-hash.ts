import "server-only";

import { createHash } from "node:crypto";

const EMAIL_MAX = 320;
const USER_ID_MAX = 128;

/** Meta CAPI email normalization: trim + lowercase. */
export function normalizeMetaEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > EMAIL_MAX) return null;
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || !domain || domain.indexOf("@") !== -1) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return null;
  if (!/^[a-z0-9.-]+$/.test(domain) || !domain.includes(".")) return null;
  return trimmed;
}

/** SHA-256 hex lowercase for Meta user_data.em. Never returns plaintext. */
export function hashMetaEmail(email: string): string | null {
  const normalized = normalizeMetaEmail(email);
  if (!normalized) return null;
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** SHA-256 hex lowercase for Meta user_data.external_id from stable user UUID. */
export function hashMetaExternalId(userId: string): string | null {
  const trimmed = userId.trim();
  if (!trimmed || trimmed.length > USER_ID_MAX) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(trimmed)) return null;
  return createHash("sha256").update(trimmed, "utf8").digest("hex");
}
