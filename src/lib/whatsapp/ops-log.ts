import "server-only";

import { logger } from "@/lib/logging/logger";

/**
 * Operational WhatsApp logs — never include wa_id, phone, text, tokens, or payloads.
 */

export type WhatsAppOpsEvent =
  | "webhook_received"
  | "signature_rejected"
  | "event_ignored"
  | "event_deduplicated"
  | "bundle_ready"
  | "pending_identity"
  | "processing_failed"
  | "channel_disabled"
  | "verify_failed"
  | "verify_ok";

export function logWhatsAppOps(
  event: WhatsAppOpsEvent,
  fields: Record<string, string | number | boolean | undefined> = {},
): void {
  logger.info(`whatsapp_${event}`, {
    channel: "whatsapp",
    ...fields,
  });
}
