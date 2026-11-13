import "server-only";

import { applyWhatsAppDeliveryStatus } from "@/lib/whatsapp/outbound-claim";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

/**
 * Delivery status events from Meta webhooks — no PII, no raw payload.
 */

export type NormalizedDeliveryStatus = {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  eventAt: Date;
  providerErrorCode: string | null;
};

export type NormalizeStatusesResult =
  | { kind: "statuses"; statuses: NormalizedDeliveryStatus[] }
  | { kind: "none" };

const ALLOWED = new Set(["sent", "delivered", "read", "failed"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseTimestamp(raw: unknown, fallback: Date): Date {
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const ms = Number.parseInt(raw, 10) * 1000;
    if (Number.isFinite(ms) && ms > 0) return new Date(ms);
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return new Date(ms);
  }
  return fallback;
}

function extractErrorCode(statusObj: Record<string, unknown>): string | null {
  const errors = statusObj.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first = asRecord(errors[0]);
  if (!first) return null;
  const code = first.code;
  if (typeof code === "number" && Number.isFinite(code)) {
    return String(Math.floor(code)).slice(0, 32);
  }
  if (typeof code === "string" && /^\d{1,10}$/.test(code)) {
    return code.slice(0, 32);
  }
  return null;
}

/**
 * Extract delivery statuses only — never recipient/phone/pricing payloads.
 */
export function normalizeWhatsAppDeliveryStatuses(
  payload: unknown,
  options?: { now?: Date },
): NormalizeStatusesResult {
  const now = options?.now ?? new Date();
  const root = asRecord(payload);
  if (!root) return { kind: "none" };

  const entries = Array.isArray(root.entry) ? root.entry : null;
  if (!entries || entries.length === 0) return { kind: "none" };

  const out: NormalizedDeliveryStatus[] = [];

  for (const entry of entries) {
    const entryObj = asRecord(entry);
    if (!entryObj) continue;
    const changes = Array.isArray(entryObj.changes) ? entryObj.changes : [];
    for (const change of changes) {
      const changeObj = asRecord(change);
      if (!changeObj) continue;
      const value = asRecord(changeObj.value);
      if (!value) continue;

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const statusObj = asRecord(st);
        if (!statusObj) continue;

        const id =
          typeof statusObj.id === "string" ? statusObj.id.trim() : "";
        const statusRaw =
          typeof statusObj.status === "string"
            ? statusObj.status.trim().toLowerCase()
            : "";
        if (!id || !ALLOWED.has(statusRaw)) continue;

        out.push({
          providerMessageId: id,
          status: statusRaw as NormalizedDeliveryStatus["status"],
          eventAt: parseTimestamp(statusObj.timestamp, now),
          providerErrorCode: extractErrorCode(statusObj),
        });
      }
    }
  }

  return out.length > 0 ? { kind: "statuses", statuses: out } : { kind: "none" };
}

export async function applyNormalizedDeliveryStatuses(
  statuses: NormalizedDeliveryStatus[],
): Promise<{ applied: number; ignored: number }> {
  let applied = 0;
  let ignored = 0;
  for (const st of statuses) {
    const result = await applyWhatsAppDeliveryStatus({
      providerMessageId: st.providerMessageId,
      status: st.status,
      eventAt: st.eventAt,
      providerErrorCode: st.providerErrorCode,
    });
    if (result.applied) {
      applied += 1;
      logWhatsAppOps("delivery_status_applied", {
        eventIdPrefix: st.providerMessageId.slice(0, 8),
      });
    } else {
      ignored += 1;
      logWhatsAppOps("delivery_status_ignored", {
        reason: result.reason ?? "ignored",
      });
    }
  }
  return { applied, ignored };
}
