import "server-only";

import { cache } from "react";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "./metrics";

/**
 * These are structured application logs (via `logger`) — not a persistent audit ledger/table.
 * They exist for operational traceability of admin actions and are subject to the same
 * retention as other app logs. They are NOT a compliance-grade audit trail and store no PII
 * (emails, names, or message content), only masked identifiers.
 */

/**
 * Wrapped in React's per-request `cache()` so that if the admin user detail
 * page (or a layout/page pair) triggers this helper more than once while
 * rendering the same request, only a single event is emitted.
 */
export const logAdminUserDetailViewed = cache(function logAdminUserDetailViewed(
  actorUserId: string,
  targetUserId: string,
): void {
  logger.info("admin_user_detail_viewed", {
    actorMask: maskUserId(actorUserId),
    actorRole: "admin",
    targetMask: maskUserId(targetUserId),
    viewedAt: new Date().toISOString(),
  });
});
