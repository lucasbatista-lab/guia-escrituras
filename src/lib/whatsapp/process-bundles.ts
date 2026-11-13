import "server-only";

import type { AuthUserContext } from "@/lib/auth";
import { resolveEntitlements } from "@/lib/entitlements";
import { isWhatsAppChannelEnabled } from "@/lib/whatsapp/config";
import {
  claimNextWhatsAppInboundBundle,
  completeWhatsAppInboundBundle,
  retryWhatsAppInboundBundle,
  type ClaimedInboundBundle,
  type MemoryWhatsAppClaimStore,
} from "@/lib/whatsapp/claim";
import {
  consumeWhatsAppLinkCode,
  parseVincularCommand,
  type ConsumeLinkResult,
} from "@/lib/whatsapp/link-tokens";
import {
  FakeChannelIdentityResolver,
  SupabaseChannelIdentityResolver,
  type ChannelIdentityResolver,
  type ResolvedChannelIdentity,
} from "@/lib/whatsapp/identity";
import {
  insertWhatsAppOutboundMessage,
  LINK_CONFIRMATION_COPY,
  MemoryWhatsAppOutbox,
  outboundIdempotencyKey,
} from "@/lib/whatsapp/outbox";
import { processWhatsAppTextTurn } from "@/lib/whatsapp/process-text-turn";
import { loadAuthUserContextForUserId } from "@/lib/whatsapp/auth-for-user";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";
import type { runChatTurn } from "@/lib/ai/chat-service";

export type BundleProcessOutcome =
  | "linked"
  | "link_failed"
  | "pending_identity"
  | "access_required"
  | "processed"
  | "retried"
  | "failed"
  | "skipped";

export type ProcessBundlesResult = {
  processed: number;
  outcomes: BundleProcessOutcome[];
};

export type ProcessBundlesDeps = {
  enabled?: boolean;
  maxBundles?: number;
  claim?: () => Promise<ClaimedInboundBundle | null>;
  complete?: (
    bundleId: string,
    status: "processed" | "pending_identity" | "ignored" | "failed",
    errorCode?: string | null,
  ) => Promise<boolean>;
  retry?: (
    bundleId: string,
    attemptCount: number,
    errorCode?: string | null,
  ) => Promise<"retry" | "failed" | "unavailable">;
  resolveIdentity?: (
    externalSenderId: string,
  ) => Promise<ResolvedChannelIdentity | null>;
  consumeLink?: (input: {
    plaintextCode: string;
    externalSenderId: string;
  }) => Promise<{
    result: ConsumeLinkResult;
    identityId?: string;
    userId?: string;
  }>;
  loadAuth?: (userId: string) => Promise<AuthUserContext | null>;
  runTurn?: typeof runChatTurn;
  insertOutbox?: typeof insertWhatsAppOutboundMessage;
  memoryClaim?: MemoryWhatsAppClaimStore;
  memoryOutbox?: MemoryWhatsAppOutbox;
  memoryIdentity?: FakeChannelIdentityResolver;
  now?: Date;
};

function linkFailureStatus(
  result: ConsumeLinkResult,
): "processed" | "failed" {
  // Command handled; do not retry forever for invalid/expired tokens.
  if (
    result === "token_invalid" ||
    result === "token_expired" ||
    result === "token_consumed" ||
    result === "attempts_exceeded" ||
    result === "external_identity_conflict" ||
    result === "user_already_has_other_identity"
  ) {
    return "processed";
  }
  return "failed";
}

function linkErrorCode(result: ConsumeLinkResult): string {
  switch (result) {
    case "token_invalid":
      return "link_token_invalid";
    case "token_expired":
      return "link_token_expired";
    case "token_consumed":
      return "link_token_consumed";
    case "attempts_exceeded":
      return "link_attempts_exceeded";
    case "external_identity_conflict":
    case "user_already_has_other_identity":
      return "link_conflict";
    case "secret_missing":
      return "link_secret_missing";
    case "rpc_unavailable":
      return "link_rpc_unavailable";
    default:
      return "link_internal_error";
  }
}

async function defaultResolve(
  externalSenderId: string,
): Promise<ResolvedChannelIdentity | null> {
  const resolver = new SupabaseChannelIdentityResolver();
  return resolver.resolveDetailed({
    channel: "whatsapp",
    externalSenderId,
  });
}

async function processOneClaimed(
  claimed: ClaimedInboundBundle,
  deps: ProcessBundlesDeps,
): Promise<BundleProcessOutcome> {
  const complete =
    deps.complete ??
    ((bundleId, status, errorCode) =>
      completeWhatsAppInboundBundle({ bundleId, status, errorCode }));
  const retry =
    deps.retry ??
    ((bundleId, attemptCount, errorCode) =>
      retryWhatsAppInboundBundle({ bundleId, attemptCount, errorCode }));
  const consumeLink = deps.consumeLink ?? consumeWhatsAppLinkCode;
  const resolveIdentity = deps.resolveIdentity ?? defaultResolve;
  const loadAuth = deps.loadAuth ?? loadAuthUserContextForUserId;
  const insertOutbox = deps.insertOutbox ?? insertWhatsAppOutboundMessage;

  const text = claimed.bundle.text;
  const vincularCode = parseVincularCommand(text);

  if (vincularCode) {
    const consumed = await consumeLink({
      plaintextCode: vincularCode,
      externalSenderId: claimed.bundle.externalSenderId,
    });

    if (
      consumed.result === "linked" ||
      consumed.result === "already_linked_same_user"
    ) {
      if (!consumed.identityId) {
        await complete(claimed.bundleId, "failed", "link_missing_identity");
        return "failed";
      }
      const out = await insertOutbox({
        identityId: consumed.identityId,
        idempotencyKey: outboundIdempotencyKey(claimed.bundleId),
        messageType: "link_confirmation",
        bodyText: LINK_CONFIRMATION_COPY,
      });
      if (out.kind === "unavailable") {
        await retry(claimed.bundleId, claimed.attemptCount, "outbox_unavailable");
        return "retried";
      }
      await complete(claimed.bundleId, "processed");
      return "linked";
    }

    const status = linkFailureStatus(consumed.result);
    await complete(
      claimed.bundleId,
      status === "processed" ? "processed" : "failed",
      linkErrorCode(consumed.result),
    );
    return "link_failed";
  }

  const identity = await resolveIdentity(claimed.bundle.externalSenderId);
  if (!identity) {
    await complete(claimed.bundleId, "pending_identity");
    return "pending_identity";
  }

  const auth = await loadAuth(identity.userId);
  if (!auth) {
    await retry(claimed.bundleId, claimed.attemptCount, "auth_load_failed");
    return "retried";
  }

  if (!auth.planKey) {
    logWhatsAppOps("access_required", {
      eventIdPrefix: claimed.bundleId.slice(0, 8),
    });
    await complete(claimed.bundleId, "processed", "access_required");
    return "access_required";
  }

  const entitlements = resolveEntitlements({ planKey: auth.planKey });
  if (!entitlements.has("chat_standard")) {
    logWhatsAppOps("access_required", {
      eventIdPrefix: claimed.bundleId.slice(0, 8),
    });
    await complete(claimed.bundleId, "processed", "access_required");
    return "access_required";
  }

  try {
    const turn = await processWhatsAppTextTurn({
      bundle: claimed.bundle,
      auth,
      runTurn: deps.runTurn,
      dispatchOutbound: false,
    });

    const out = await insertOutbox({
      identityId: identity.identityId,
      idempotencyKey: outboundIdempotencyKey(claimed.bundleId),
      messageType: "text",
      bodyText: turn.outboundText,
    });

    if (out.kind === "unavailable") {
      await retry(claimed.bundleId, claimed.attemptCount, "outbox_unavailable");
      return "retried";
    }

    await complete(claimed.bundleId, "processed");
    return "processed";
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code ?? "turn_failed")
        : "turn_failed";

    if (
      code === "subscription_required" ||
      code === "missing_entitlement" ||
      code === "personalization_required"
    ) {
      logWhatsAppOps("access_required", {
        eventIdPrefix: claimed.bundleId.slice(0, 8),
      });
      await complete(claimed.bundleId, "processed", "access_required");
      return "access_required";
    }

    // Definitive vs transient
    if (
      code === "invalid_message" ||
      code === "forbidden" ||
      code === "content_policy"
    ) {
      await complete(claimed.bundleId, "failed", code);
      return "failed";
    }

    const outcome = await retry(
      claimed.bundleId,
      claimed.attemptCount,
      "transient_error",
    );
    return outcome === "failed" ? "failed" : "retried";
  }
}

/**
 * Process available WhatsApp inbound bundles.
 * Never calls Meta Graph. Never sends outbound in this block.
 */
export async function processAvailableWhatsAppBundles(
  deps: ProcessBundlesDeps = {},
): Promise<ProcessBundlesResult> {
  const enabled = deps.enabled ?? isWhatsAppChannelEnabled();
  if (!enabled) {
    logWhatsAppOps("channel_disabled");
    return { processed: 0, outcomes: [] };
  }

  const maxBundles = Math.min(Math.max(deps.maxBundles ?? 5, 1), 20);
  const outcomes: BundleProcessOutcome[] = [];

  for (let i = 0; i < maxBundles; i++) {
    let claimed: ClaimedInboundBundle | null = null;

    if (deps.claim) {
      claimed = await deps.claim();
    } else if (deps.memoryClaim) {
      const result = deps.memoryClaim.claim({
        now: deps.now ?? new Date(),
      });
      claimed = result.claimed ? result.value : null;
    } else {
      const result = await claimNextWhatsAppInboundBundle();
      claimed = result.claimed ? result.value : null;
    }

    if (!claimed) break;

    // Wire memory complete/retry/outbox/identity when provided.
    const localDeps: ProcessBundlesDeps = { ...deps };
    if (deps.memoryClaim && !deps.complete) {
      localDeps.complete = async (bundleId, status) => {
        deps.memoryClaim!.complete(bundleId, status);
        return true;
      };
    }
    if (deps.memoryClaim && !deps.retry) {
      localDeps.retry = async (bundleId, attemptCount) => {
        const o = deps.memoryClaim!.retry(bundleId, attemptCount);
        return o;
      };
    }
    if (deps.memoryOutbox && !deps.insertOutbox) {
      localDeps.insertOutbox = async (input) =>
        deps.memoryOutbox!.insert(input);
    }
    if (deps.memoryIdentity && !deps.resolveIdentity) {
      localDeps.resolveIdentity = async (externalSenderId) =>
        deps.memoryIdentity!.resolveDetailed({
          channel: "whatsapp",
          externalSenderId,
        });
    }

    const outcome = await processOneClaimed(claimed, localDeps);
    outcomes.push(outcome);
  }

  return { processed: outcomes.length, outcomes };
}

/** Type-only re-export helper for tests that inject FakeChannelIdentityResolver. */
export type { ChannelIdentityResolver };
