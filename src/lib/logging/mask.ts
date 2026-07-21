/** Masking helpers for structured logs — never log full secrets or PII. */

export function maskUserId(userId: string | null | undefined): string | undefined {
  if (!userId) return undefined;
  return `usr_${userId.slice(0, 8)}`;
}

export function maskEmail(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const localMask =
    local.length <= 2 ? "*" : `${local.slice(0, 1)}***${local.slice(-1)}`;
  return `${localMask}@${domain}`;
}

export function maskStripeId(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  if (id.length <= 10) return `${id.slice(0, 4)}…`;
  return `${id.slice(0, 8)}…`;
}

export function maskToken(token: string | null | undefined): string | undefined {
  if (!token) return undefined;
  return `tok_${token.slice(0, 4)}…`;
}

const SENSITIVE_KEY =
  /^(message|content|answer|prompt|body|text|password|token|authorization|cookie|spiritual|conversationMemory|followUpQuestion)$/i;

/**
 * Strip or truncate fields that could contain spiritual conversation content
 * or secrets before structured logging.
 */
export function redactLogFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 240) {
      out[key] = `${value.slice(0, 80)}…[truncated ${value.length}]`;
      continue;
    }
    out[key] = value;
  }
  return out;
}
