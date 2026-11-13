import "server-only";

import type { ConversationChannel } from "@/lib/channels/types";

/**
 * Identity resolution stub for WhatsApp foundation.
 * Production resolver always returns null until user_channel_identities exists.
 * Never associate by phone possession alone. Never create users silently.
 */

export type ChannelIdentityInput = {
  channel: ConversationChannel;
  externalSenderId: string;
};

export interface ChannelIdentityResolver {
  resolve(input: ChannelIdentityInput): Promise<string | null>;
}

/** Safe default — no automatic linking. */
export class NullChannelIdentityResolver implements ChannelIdentityResolver {
  async resolve(input: ChannelIdentityInput): Promise<string | null> {
    void input;
    return null;
  }
}

/** Test-only in-memory map. Never use in production routes. */
export class FakeChannelIdentityResolver implements ChannelIdentityResolver {
  private readonly map = new Map<string, string>();

  seed(channel: ConversationChannel, externalSenderId: string, userId: string) {
    this.map.set(`${channel}:${externalSenderId}`, userId);
  }

  async resolve(input: ChannelIdentityInput): Promise<string | null> {
    return this.map.get(`${input.channel}:${input.externalSenderId}`) ?? null;
  }
}

export const defaultWhatsAppIdentityResolver =
  new NullChannelIdentityResolver();
