import "server-only";

import { cache } from "react";
import { logger } from "@/lib/logging/logger";

/**
 * These are structured application logs (via `logger`) — not a persistent audit ledger/table.
 * They exist for operational traceability of admin actions and are subject to the same
 * retention as other app logs. They are NOT a compliance-grade audit trail.
 *
 * Internal UUIDs are allowed for correlation. PII is forbidden (email, name, message
 * content, spiritual summaries, card data, cookies, JWT, secrets, CSV, full payloads, full UTM).
 */

/**
 * Wrapped in React's per-request `cache()` so that if the admin user detail
 * page (or a layout/page pair) triggers this helper more than once while
 * rendering the same request, only a single event is emitted.
 *
 * `actorRole` is the known admin gate today (`admin`); fine-grained RBAC roles
 * are not yet exposed on the session context.
 */
export const logAdminUserDetailViewed = cache(function logAdminUserDetailViewed(
  actorUserId: string,
  targetUserId: string,
  actorRole: "admin" | "ops" | "finance" = "admin",
): void {
  // Timestamp (`ts`) is added by the logger infrastructure.
  logger.info("admin_user_detail_viewed", {
    action: "admin_user_detail_viewed",
    actor_user_id: actorUserId,
    actor_role: actorRole,
    target_user_id: targetUserId,
  });
});
