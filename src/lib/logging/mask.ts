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
  /^(message|content|answer|prompt|body|text|password|token|authorization|cookie|email|stripeCustomerId|stripeSubscriptionId|spiritual|conversationMemory|followUpQuestion|crisis|prayer|confession)$/i;

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (typeof value === "string") {
    if (value.length > 240) {
      return `${value.slice(0, 80)}…[truncated ${value.length}]`;
    }
    return value;
  }
  if (value && typeof value === "object" && !Array.isArray(value) && depth < 1) {
    return redactLogFields(value as Record<string, unknown>, depth + 1);
  }
  if (Array.isArray(value) && depth < 1) {
    return value.map((item, index) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? redactLogFields(item as Record<string, unknown>, depth + 1)
        : redactValue(String(index), item, depth + 1),
    );
  }
  return value;
}

/**
 * Strip or truncate fields that could contain spiritual conversation content
 * or secrets before structured logging. Recurses one level into nested objects.
 */
export function redactLogFields(
  fields: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = redactValue(key, value, depth);
  }
  return out;
}
