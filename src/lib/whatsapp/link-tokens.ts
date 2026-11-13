import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppLinkTokenSecret } from "@/lib/whatsapp/config";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

/**
 * Authenticated WhatsApp link codes.
 * Plaintext shown once to the session owner; only HMAC hash is stored.
 */

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
export const LINK_CODE_MAX_ATTEMPTS = 5;
/** Alphabet without 0/O/1/I/L for human typing. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type CreateLinkCodeResult =
  | {
      ok: true;
      code: string;
      expiresAt: string;
    }
  | { ok: false; code: "secret_missing" | "unauthenticated" | "persist_failed" };

export { getWhatsAppLinkTokenSecret };

export function generateLinkCodePlaintext(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]!;
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function normalizeLinkCodeInput(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== 8) return null;
  for (const ch of cleaned) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

export function hashLinkCode(
  code: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(code, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Parse inbound text as VINCULAR command. Strict — no embedded junk. */
export function parseVincularCommand(text: string): string | null {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  const match = /^VINCULAR\s+([A-Za-z0-9-]{8,10})$/i.exec(trimmed);
  if (!match) return null;
  return normalizeLinkCodeInput(match[1]!);
}

export async function createWhatsAppLinkCode(input: {
  userId: string;
}): Promise<CreateLinkCodeResult> {
  const secret = getWhatsAppLinkTokenSecret();
  if (!secret) return { ok: false, code: "secret_missing" };
  if (!input.userId) return { ok: false, code: "unauthenticated" };

  const plaintext = generateLinkCodePlaintext();
  const tokenHash = hashLinkCode(plaintext, secret);
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    await admin
      .from("channel_identity_link_tokens")
      .update({
        invalidated_at: nowIso,
        updated_at: nowIso,
      })
      .eq("user_id", input.userId)
      .eq("channel", "whatsapp")
      .is("consumed_at", null)
      .is("invalidated_at", null);

    const { error } = await admin.from("channel_identity_link_tokens").insert({
      user_id: input.userId,
      channel: "whatsapp",
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      attempt_count: 0,
      max_attempts: LINK_CODE_MAX_ATTEMPTS,
    });

    if (error) return { ok: false, code: "persist_failed" };

    logWhatsAppOps("identity_link_code_created", {
      eventIdPrefix: input.userId.slice(0, 8),
    });

    return {
      ok: true,
      code: plaintext,
      expiresAt: expiresAt.toISOString(),
    };
  } catch {
    return { ok: false, code: "persist_failed" };
  }
}

export type ConsumeLinkResult =
  | "linked"
  | "already_linked_same_user"
  | "token_invalid"
  | "token_expired"
  | "token_consumed"
  | "attempts_exceeded"
  | "external_identity_conflict"
  | "user_already_has_other_identity"
  | "internal_error"
  | "secret_missing"
  | "rpc_unavailable";

export async function consumeWhatsAppLinkCode(input: {
  plaintextCode: string;
  externalSenderId: string;
}): Promise<{
  result: ConsumeLinkResult;
  identityId?: string;
  userId?: string;
}> {
  const secret = getWhatsAppLinkTokenSecret();
  if (!secret) return { result: "secret_missing" };

  const normalized = normalizeLinkCodeInput(input.plaintextCode);
  if (!normalized) return { result: "token_invalid" };

  const tokenHash = hashLinkCode(normalized, secret);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("whatsapp_consume_link_token", {
      p_token_hash: tokenHash,
      p_external_id: input.externalSenderId,
    });

    if (error || !data) return { result: "rpc_unavailable" };

    const row = data as {
      result?: string;
      identity_id?: string;
      user_id?: string;
    };
    const result = (row.result ?? "internal_error") as ConsumeLinkResult;

    if (result === "linked" || result === "already_linked_same_user") {
      logWhatsAppOps("identity_linked", {
        eventIdPrefix: (row.identity_id ?? "unknown").slice(0, 8),
      });
    } else if (
      result === "external_identity_conflict" ||
      result === "user_already_has_other_identity"
    ) {
      logWhatsAppOps("identity_link_conflict");
    }

    return {
      result,
      identityId: row.identity_id,
      userId: row.user_id,
    };
  } catch {
    return { result: "internal_error" };
  }
}

/** In-memory token store for unit tests (no Supabase). */
export class MemoryLinkTokenStore {
  tokens: Array<{
    userId: string;
    hash: string;
    expiresAt: number;
    consumedAt: number | null;
    invalidatedAt: number | null;
    attemptCount: number;
    maxAttempts: number;
  }> = [];

  create(userId: string, secret: string): { code: string; expiresAt: Date } {
    for (const t of this.tokens) {
      if (
        t.userId === userId &&
        t.consumedAt == null &&
        t.invalidatedAt == null
      ) {
        t.invalidatedAt = Date.now();
      }
    }
    const code = generateLinkCodePlaintext();
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
    this.tokens.push({
      userId,
      hash: hashLinkCode(code, secret),
      expiresAt: expiresAt.getTime(),
      consumedAt: null,
      invalidatedAt: null,
      attemptCount: 0,
      maxAttempts: LINK_CODE_MAX_ATTEMPTS,
    });
    return { code, expiresAt };
  }

  consume(
    code: string,
    secret: string,
    externalId: string,
    identities: Map<string, { userId: string; externalId: string; status: string }>,
  ): ConsumeLinkResult {
    const normalized = normalizeLinkCodeInput(code);
    if (!normalized) return "token_invalid";
    const hash = hashLinkCode(normalized, secret);
    const token = this.tokens.find(
      (t) => t.hash === hash && t.invalidatedAt == null,
    );
    if (!token) return "token_invalid";
    if (token.consumedAt != null) return "token_consumed";
    if (Date.now() > token.expiresAt) return "token_expired";
    token.attemptCount += 1;
    if (token.attemptCount > token.maxAttempts) return "attempts_exceeded";

    for (const id of identities.values()) {
      if (
        id.status === "active" &&
        id.externalId === externalId &&
        id.userId !== token.userId
      ) {
        return "external_identity_conflict";
      }
      if (
        id.status === "active" &&
        id.userId === token.userId &&
        id.externalId !== externalId
      ) {
        return "user_already_has_other_identity";
      }
      if (
        id.status === "active" &&
        id.userId === token.userId &&
        id.externalId === externalId
      ) {
        token.consumedAt = Date.now();
        return "already_linked_same_user";
      }
    }

    identities.set(`${token.userId}:${externalId}`, {
      userId: token.userId,
      externalId,
      status: "active",
    });
    token.consumedAt = Date.now();
    return "linked";
  }
}
