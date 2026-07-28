/**
 * Classify admin subscriber search before any DB scan.
 * Technical IDs are exact-only; never approximate UUID/Stripe/request matches.
 */

export type AdminTechnicalLookupKind =
  | "user_uuid"
  | "conversation_uuid"
  | "request_id"
  | "stripe_customer"
  | "stripe_subscription"
  | "email"
  | "display_name"
  | "ambiguous_uuid"
  | "empty"
  | "unsupported";

export interface AdminTechnicalLookupClassification {
  kind: AdminTechnicalLookupKind;
  /** Normalized needle used for exact queries (trimmed). */
  needle: string;
  /** Human hint for empty/invalid technical forms. */
  hint?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAdminUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Detect lookup strategy from the raw search box.
 * UUID may resolve to profile, conversation, or usage request_id — callers
 * must try exact tables in that order and never fuzzy-match IDs.
 */
export function classifyAdminTechnicalLookup(
  raw: string | null | undefined,
): AdminTechnicalLookupClassification {
  const needle = (raw ?? "").trim();
  if (!needle) return { kind: "empty", needle: "" };

  if (needle.startsWith("cus_")) {
    if (needle.length < 5 || /\s/.test(needle)) {
      return {
        kind: "unsupported",
        needle,
        hint: "Customer ID Stripe inválido (ex.: cus_…).",
      };
    }
    return { kind: "stripe_customer", needle };
  }

  if (needle.startsWith("sub_")) {
    if (needle.length < 5 || /\s/.test(needle)) {
      return {
        kind: "unsupported",
        needle,
        hint: "Subscription ID Stripe inválido (ex.: sub_…).",
      };
    }
    return { kind: "stripe_subscription", needle };
  }

  if (needle.includes("@")) {
    return { kind: "email", needle };
  }

  if (isAdminUuid(needle)) {
    // Exact UUID — may be user, conversation, or request_id. Not display_name.
    return { kind: "ambiguous_uuid", needle: needle.toLowerCase() };
  }

  // Non-technical free text → existing display_name ILIKE path (bounded).
  return { kind: "display_name", needle };
}

export const ADMIN_TECHNICAL_SEARCH_HINT =
  "Formatos exatos: UUID do usuário, cus_…, sub_…, requestId (UUID) ou UUID de conversa. E-mail e nome seguem a busca habitual.";

export const ADMIN_INACTIVE_DAY_THRESHOLDS = [3, 7, 14, 30] as const;
export type AdminInactiveDays = (typeof ADMIN_INACTIVE_DAY_THRESHOLDS)[number];

export function parseAdminInactiveDays(
  raw: string | undefined,
): AdminInactiveDays | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  return ADMIN_INACTIVE_DAY_THRESHOLDS.includes(n as AdminInactiveDays)
    ? (n as AdminInactiveDays)
    : undefined;
}

/** Continuous rolling threshold (not civil calendar day). */
export function inactivityThresholdIso(days: number, nowMs = Date.now()): string {
  return new Date(nowMs - days * 86_400_000).toISOString();
}
