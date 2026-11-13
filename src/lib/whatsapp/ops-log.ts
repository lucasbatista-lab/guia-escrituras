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
  | "verify_ok"
  | "identity_link_code_created"
  | "identity_linked"
  | "identity_link_conflict"
  | "identity_revoked"
  | "bundle_claimed"
  | "bundle_completed"
  | "bundle_retried"
  | "bundle_failed"
  | "outbox_created"
  | "access_required"
  | "worker_unauthorized"
  | "worker_disabled"
  | "outbound_batch_started"
  | "outbound_claimed"
  | "outbound_sent"
  | "outbound_retry_scheduled"
  | "outbound_failed"
  | "outbound_delivery_unknown"
  | "outbound_cancelled"
  | "delivery_status_applied"
  | "delivery_status_ignored"
  | "meta_configuration_error";

export function logWhatsAppOps(
  event: WhatsAppOpsEvent,
  fields: Record<string, string | number | boolean | undefined> = {},
): void {
  logger.info(`whatsapp_${event}`, {
    channel: "whatsapp",
    ...fields,
  });
}
