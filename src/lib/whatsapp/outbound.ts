/**
 * Outbound port — interface + fake only in this foundation block.
 * No Graph API fetch. No ACCESS_TOKEN usage.
 */

export type WhatsAppOutboundText = {
  toExternalSenderId: string;
  text: string;
  correlationId: string;
};

export interface WhatsAppOutboundPort {
  sendText(message: WhatsAppOutboundText): Promise<{ ok: true } | { ok: false; code: string }>;
}

/** Records sends for tests; never contacts Meta. */
export class FakeWhatsAppOutboundPort implements WhatsAppOutboundPort {
  readonly sent: WhatsAppOutboundText[] = [];

  async sendText(
    message: WhatsAppOutboundText,
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    this.sent.push(message);
    return { ok: true };
  }
}

/**
 * Production stub — refuses to send until a later block implements Graph client.
 */
export class NoopWhatsAppOutboundPort implements WhatsAppOutboundPort {
  async sendText(
    message: WhatsAppOutboundText,
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    void message;
    return { ok: false, code: "outbound_not_implemented" };
  }
}
