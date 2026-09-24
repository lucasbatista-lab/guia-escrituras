import "server-only";

import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { planKeyFromAppleProductId } from "@/lib/billing/apple-products";
import type { AppleIapEnvironment } from "@/lib/apple/config";
import {
  bindAppleSubscriptionOwner,
  findAppleSubscriptionByOriginal,
  upsertAppleSubscriptionState,
} from "@/lib/apple/persistence";
import {
  msToIso,
  normalizeAppleAccessStatus,
} from "@/lib/apple/status";

export type BindVerifiedAppleResult =
  | { ok: true; idempotent: boolean; planKey: string }
  | {
      ok: false;
      code:
        | "unknown_product"
        | "missing_fields"
        | "conflict"
        | "persist_failed";
      message: string;
    };

/**
 * Associate a cryptographically verified Apple transaction to an authenticated user.
 * Never trusts client planKey.
 */
export async function bindVerifiedAppleSubscriptionToUser(input: {
  authenticatedUserId: string;
  environment: AppleIapEnvironment;
  transaction: JWSTransactionDecodedPayload;
}): Promise<BindVerifiedAppleResult> {
  const originalTransactionId = input.transaction.originalTransactionId?.trim();
  const productId = input.transaction.productId?.trim();
  if (!originalTransactionId || !productId) {
    return {
      ok: false,
      code: "missing_fields",
      message: "Transação Apple incompleta.",
    };
  }

  const planKey = planKeyFromAppleProductId(productId);
  if (!planKey) {
    return {
      ok: false,
      code: "unknown_product",
      message: "Produto Apple não reconhecido.",
    };
  }

  const accessStatus = normalizeAppleAccessStatus({
    revocationDate: input.transaction.revocationDate ?? null,
    expiresDate: input.transaction.expiresDate ?? null,
    // Transaction payload may not include grace; notifications may update later.
    gracePeriodExpiresDate: null,
  });

  const signedAt = msToIso(input.transaction.signedDate ?? null);

  try {
    const existing = await findAppleSubscriptionByOriginal({
      environment: input.environment,
      originalTransactionId,
    });

    if (existing?.userId && existing.userId !== input.authenticatedUserId) {
      return {
        ok: false,
        code: "conflict",
        message: "Esta assinatura Apple já está vinculada a outra conta.",
      };
    }

    await upsertAppleSubscriptionState({
      userId: input.authenticatedUserId,
      environment: input.environment,
      originalTransactionId,
      productId,
      planKey,
      accessStatus,
      appleStatus: input.transaction.type ?? null,
      expiresAt: msToIso(input.transaction.expiresDate ?? null),
      gracePeriodExpiresAt: null,
      autoRenewEnabled: null,
      signedAt,
    });

    if (!existing?.userId) {
      const bind = await bindAppleSubscriptionOwner({
        environment: input.environment,
        originalTransactionId,
        userId: input.authenticatedUserId,
      });
      if (!bind.ok && bind.code === "conflict") {
        return {
          ok: false,
          code: "conflict",
          message: "Esta assinatura Apple já está vinculada a outra conta.",
        };
      }
      return {
        ok: true,
        idempotent: Boolean(existing?.userId === input.authenticatedUserId),
        planKey,
      };
    }

    return {
      ok: true,
      idempotent: existing.userId === input.authenticatedUserId,
      planKey,
    };
  } catch {
    return {
      ok: false,
      code: "persist_failed",
      message: "Não foi possível vincular a assinatura agora.",
    };
  }
}
