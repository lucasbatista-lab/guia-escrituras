import "server-only";

import { randomUUID } from "node:crypto";
import type { AuthUserContext } from "@/lib/auth";
import { runChatTurn } from "@/lib/ai/chat-service";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import { formatForWhatsApp } from "@/lib/whatsapp/format-for-whatsapp";
import type { MessageBundle } from "@/lib/whatsapp/debounce";
import type {
  WhatsAppOutboundPort,
  WhatsAppOutboundText,
} from "@/lib/whatsapp/outbound";
import { NoopWhatsAppOutboundPort } from "@/lib/whatsapp/outbound";

/**
 * WhatsApp text adapter — reuses runChatTurn / runChatTurnStream.
 * Requires a resolved AuthUserContext (never synthesizes production users).
 * Does not call Meta Graph API.
 */

export type ProcessWhatsAppTextTurnInput = {
  bundle: MessageBundle;
  auth: AuthUserContext;
  /** Override for tests — defaults to runChatTurn. */
  runTurn?: typeof runChatTurn;
  outbound?: WhatsAppOutboundPort;
  /** When true, attempt outbound port (still Noop in production foundation). */
  dispatchOutbound?: boolean;
};

export type ProcessWhatsAppTextTurnResult = {
  payload: ChatResponsePayload;
  outboundText: string;
  requestId: string;
  conversationId: string;
  outbound: WhatsAppOutboundText;
  dispatched: boolean;
};

function authWithBriefDepth(auth: AuthUserContext): AuthUserContext {
  return {
    ...auth,
    spiritualProfile: {
      ...auth.spiritualProfile,
      preferredDepth: "brief",
    },
  };
}

export async function processWhatsAppTextTurn(
  input: ProcessWhatsAppTextTurnInput,
): Promise<ProcessWhatsAppTextTurnResult> {
  if (!input.auth.userId) {
    throw new Error("whatsapp_turn_requires_user");
  }
  if (!input.auth.planKey) {
    throw new Error("whatsapp_turn_requires_plan");
  }

  const requestId = randomUUID();
  const runTurn = input.runTurn ?? runChatTurn;
  const auth = authWithBriefDepth(input.auth);

  const payload = await runTurn({
    requestId,
    auth,
    body: {
      message: input.bundle.text,
      preferDeep: false,
      personaKey: "jesus",
      requestId,
    },
  });

  const outboundText = formatForWhatsApp(payload);
  const outbound: WhatsAppOutboundText = {
    toExternalSenderId: input.bundle.externalSenderId,
    text: outboundText,
    correlationId: payload.conversationId || requestId,
  };

  let dispatched = false;
  if (input.dispatchOutbound) {
    const port = input.outbound ?? new NoopWhatsAppOutboundPort();
    const result = await port.sendText(outbound);
    dispatched = result.ok;
  }

  return {
    payload,
    outboundText,
    requestId,
    conversationId: payload.conversationId,
    outbound,
    dispatched,
  };
}
