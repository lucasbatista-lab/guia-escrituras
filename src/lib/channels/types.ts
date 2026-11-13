/**
 * Channel contract — shared vocabulary for web today and WhatsApp foundation.
 * Keep independent of Meta payloads and Stripe.
 */

export type ConversationChannel = "web" | "whatsapp";

export type ChannelMessage = {
  channel: ConversationChannel;
  externalMessageId: string;
  externalSenderId: string;
  text: string;
  receivedAt: Date;
};

export type ChannelPresentationDepth = "brief" | "balanced" | "deep";

export type ChannelPresentationPolicy = {
  depth: ChannelPresentationDepth;
  /** Soft outbound character budget (platform hard limit is higher). */
  maxCharacters: number;
  supportsRichFormatting: boolean;
  supportsStreaming: boolean;
};

export const WEB_PRESENTATION_POLICY: ChannelPresentationPolicy = {
  depth: "balanced",
  maxCharacters: 12_000,
  supportsRichFormatting: true,
  supportsStreaming: true,
};

/** WhatsApp textual MVP — short, plain, single final message. */
export const WHATSAPP_PRESENTATION_POLICY: ChannelPresentationPolicy = {
  depth: "brief",
  maxCharacters: 3_500,
  supportsRichFormatting: false,
  supportsStreaming: false,
};
