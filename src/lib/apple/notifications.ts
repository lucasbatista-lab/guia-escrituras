import "server-only";

import {
  Environment,
  NotificationTypeV2,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { planKeyFromAppleProductId } from "@/lib/billing/apple-products";
import {
  AppleConfigError,
  getAppleIapConfig,
  isAppleIapConfigured,
  type AppleIapEnvironment,
} from "@/lib/apple/config";
import {
  claimBillingProviderEvent,
  markBillingProviderEvent,
} from "@/lib/apple/events";
import { upsertAppleSubscriptionState } from "@/lib/apple/persistence";
import {
  msToIso,
  normalizeAppleAccessStatus,
  type AppleAccessStatus,
} from "@/lib/apple/status";
import { createAppleSignedDataVerifier } from "@/lib/apple/verifier";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";

export type ProcessAppleNotificationResult =
  | { ok: true; duplicate?: boolean; unmatched?: boolean }
  | { ok: false; code: string; message: string; httpStatus: number };

function mapLibraryEnvironment(
  env: Environment | string | undefined,
): AppleIapEnvironment | null {
  if (env === Environment.PRODUCTION || env === "Production") return "production";
  if (env === Environment.SANDBOX || env === "Sandbox") return "sandbox";
  return null;
}

/**
 * Verify ASSN V2 signedPayload. Tries production then sandbox
 * (Apple may send both to the same production URL).
 */
export async function verifyAppleNotificationPayload(
  signedPayload: string,
): Promise<{
  environment: AppleIapEnvironment;
  notification: ResponseBodyV2DecodedPayload;
}> {
  if (!isAppleIapConfigured()) {
    throw new AppleConfigError("Apple IAP não configurado.");
  }

  const cfg = getAppleIapConfig();
  const order: AppleIapEnvironment[] =
    cfg.environment === "production"
      ? ["production", "sandbox"]
      : ["sandbox", "production"];

  let lastError: unknown;
  for (const environment of order) {
    if (environment === "production" && cfg.appAppleId == null) continue;
    try {
      const verifier = createAppleSignedDataVerifier(environment);
      const notification =
        await verifier.verifyAndDecodeNotification(signedPayload);
      return { environment, notification };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("apple_notification_verification_failed");
}

export async function verifyAppleSignedTransaction(
  signedTransaction: string,
): Promise<{
  environment: AppleIapEnvironment;
  transaction: JWSTransactionDecodedPayload;
}> {
  if (!isAppleIapConfigured()) {
    throw new AppleConfigError("Apple IAP não configurado.");
  }
  const cfg = getAppleIapConfig();
  const order: AppleIapEnvironment[] =
    cfg.environment === "production"
      ? ["production", "sandbox"]
      : ["sandbox", "production"];

  let lastError: unknown;
  for (const environment of order) {
    if (environment === "production" && cfg.appAppleId == null) continue;
    try {
      const verifier = createAppleSignedDataVerifier(environment);
      const transaction =
        await verifier.verifyAndDecodeTransaction(signedTransaction);
      return { environment, transaction };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("apple_transaction_verification_failed");
}

function forceRevokeStatus(
  notificationType: string | undefined,
): AppleAccessStatus | null {
  if (
    notificationType === NotificationTypeV2.REVOKE ||
    notificationType === NotificationTypeV2.REFUND ||
    notificationType === NotificationTypeV2.EXPIRED ||
    notificationType === NotificationTypeV2.GRACE_PERIOD_EXPIRED
  ) {
    if (notificationType === NotificationTypeV2.REVOKE) return "revoked";
    if (notificationType === NotificationTypeV2.REFUND) return "revoked";
    if (notificationType === NotificationTypeV2.GRACE_PERIOD_EXPIRED) {
      return "expired";
    }
    return "expired";
  }
  if (notificationType === NotificationTypeV2.DID_FAIL_TO_RENEW) {
    // Without an active grace window this becomes billing_retry (no access).
    return "billing_retry";
  }
  return null;
}

async function decodeNested(
  environment: AppleIapEnvironment,
  signedTransactionInfo?: string,
  signedRenewalInfo?: string,
): Promise<{
  transaction: JWSTransactionDecodedPayload | null;
  renewal: JWSRenewalInfoDecodedPayload | null;
}> {
  const verifier = createAppleSignedDataVerifier(environment);
  let transaction: JWSTransactionDecodedPayload | null = null;
  let renewal: JWSRenewalInfoDecodedPayload | null = null;
  if (signedTransactionInfo) {
    transaction = await verifier.verifyAndDecodeTransaction(
      signedTransactionInfo,
    );
  }
  if (signedRenewalInfo) {
    renewal = await verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo);
  }
  return { transaction, renewal };
}

/**
 * Process a verified App Store Server Notification V2.
 * Unknown owners → unmatched (no arbitrary user assignment).
 */
export async function processAppleNotificationV2(
  signedPayload: string,
): Promise<ProcessAppleNotificationResult> {
  let verified;
  try {
    verified = await verifyAppleNotificationPayload(signedPayload);
  } catch (error) {
    if (error instanceof AppleConfigError) {
      return {
        ok: false,
        code: "apple_not_configured",
        message: error.message,
        httpStatus: 503,
      };
    }
    logger.warn("apple_notification_verify_failed", {
      err: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      code: "verification_failed",
      message: "Payload Apple inválido.",
      httpStatus: 400,
    };
  }

  const { environment, notification } = verified;
  const notificationUUID = notification.notificationUUID?.trim();
  if (!notificationUUID) {
    return {
      ok: false,
      code: "missing_notification_uuid",
      message: "Notificação Apple sem UUID.",
      httpStatus: 400,
    };
  }

  const eventType = String(notification.notificationType ?? "UNKNOWN");
  const dataEnv =
    mapLibraryEnvironment(notification.data?.environment) ?? environment;

  // Reject if decoded data environment conflicts with verification environment.
  if (
    notification.data?.environment &&
    dataEnv !== environment &&
    eventType !== NotificationTypeV2.TEST
  ) {
    logger.warn("apple_notification_environment_mismatch", {
      verifiedEnv: environment,
      dataEnv,
      eventType,
    });
    return {
      ok: false,
      code: "environment_mismatch",
      message: "Ambiente Apple inválido.",
      httpStatus: 400,
    };
  }

  const claim = await claimBillingProviderEvent({
    provider: "apple",
    environment,
    externalEventId: notificationUUID,
    eventType,
    eventSignedAt: msToIso(notification.signedDate ?? null),
    payloadForHash: signedPayload.slice(0, 512),
  });

  if (claim.outcome === "duplicate") {
    return { ok: true, duplicate: true };
  }
  if (claim.outcome === "failed") {
    return {
      ok: false,
      code: "idempotency_failed",
      message: "Não foi possível registrar o evento.",
      httpStatus: 500,
    };
  }

  if (eventType === NotificationTypeV2.TEST) {
    await markBillingProviderEvent({
      provider: "apple",
      environment,
      externalEventId: notificationUUID,
      status: "ignored",
    });
    return { ok: true };
  }

  try {
    const nested = await decodeNested(
      environment,
      notification.data?.signedTransactionInfo,
      notification.data?.signedRenewalInfo,
    );

    const transaction = nested.transaction;
    const renewal = nested.renewal;
    const originalTransactionId =
      transaction?.originalTransactionId?.trim() ||
      renewal?.originalTransactionId?.trim() ||
      null;
    const productId =
      transaction?.productId?.trim() ||
      renewal?.autoRenewProductId?.trim() ||
      null;

    if (!originalTransactionId || !productId) {
      await markBillingProviderEvent({
        provider: "apple",
        environment,
        externalEventId: notificationUUID,
        status: "ignored",
        lastErrorCode: "missing_transaction_fields",
      });
      logger.info("apple_notification_ignored_incomplete", {
        eventType,
        notificationUUID,
      });
      return { ok: true };
    }

    const planKey = planKeyFromAppleProductId(productId);
    if (!planKey) {
      await markBillingProviderEvent({
        provider: "apple",
        environment,
        externalEventId: notificationUUID,
        status: "ignored",
        relatedOriginalTransactionId: originalTransactionId,
        lastErrorCode: "unknown_product",
      });
      logger.warn("apple_notification_unknown_product", {
        eventType,
        notificationUUID,
      });
      return { ok: true };
    }

    let accessStatus =
      forceRevokeStatus(eventType) ??
      normalizeAppleAccessStatus({
        revocationDate: transaction?.revocationDate ?? null,
        expiresDate: transaction?.expiresDate ?? null,
        gracePeriodExpiresDate: renewal?.gracePeriodExpiresDate ?? null,
      });

    // DID_FAIL_TO_RENEW with active grace → grace (grants).
    if (
      eventType === NotificationTypeV2.DID_FAIL_TO_RENEW &&
      renewal?.gracePeriodExpiresDate &&
      renewal.gracePeriodExpiresDate > Date.now()
    ) {
      accessStatus = "grace";
    }

    const signedAt =
      msToIso(transaction?.signedDate ?? null) ??
      msToIso(notification.signedDate ?? null);

    const { record } = await upsertAppleSubscriptionState({
      userId: null,
      environment,
      originalTransactionId,
      productId,
      planKey,
      accessStatus,
      appleStatus: eventType,
      expiresAt: msToIso(transaction?.expiresDate ?? null),
      gracePeriodExpiresAt: msToIso(renewal?.gracePeriodExpiresDate ?? null),
      autoRenewEnabled:
        renewal?.autoRenewStatus === 1
          ? true
          : renewal?.autoRenewStatus === 0
            ? false
            : null,
      signedAt,
    });

    const unmatched = !record?.userId;
    await markBillingProviderEvent({
      provider: "apple",
      environment,
      externalEventId: notificationUUID,
      status: unmatched ? "unmatched" : "processed",
      relatedUserId: record?.userId ?? null,
      relatedOriginalTransactionId: originalTransactionId,
    });

    logger.info("apple_notification_processed", {
      eventType,
      notificationUUID,
      environment,
      unmatched,
      accessStatus,
      userId: maskUserId(record?.userId),
    });

    return { ok: true, unmatched };
  } catch (error) {
    await markBillingProviderEvent({
      provider: "apple",
      environment,
      externalEventId: notificationUUID,
      status: "failed",
      lastErrorCode: "process_failed",
    });
    logger.error("apple_notification_process_failed", {
      notificationUUID,
      eventType,
      err: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      code: "process_failed",
      message: "Falha ao processar notificação Apple.",
      httpStatus: 500,
    };
  }
}
