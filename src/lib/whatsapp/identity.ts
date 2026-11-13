import "server-only";

import type { ConversationChannel } from "@/lib/channels/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Identity resolution for WhatsApp.
 * Production looks up active user_channel_identities only.
 * Never associate by phone possession alone. Never create users here.
 */

export type ChannelIdentityInput = {
  channel: ConversationChannel;
  externalSenderId: string;
};

export type ResolvedChannelIdentity = {
  userId: string;
  identityId: string;
};

export interface ChannelIdentityResolver {
  resolve(input: ChannelIdentityInput): Promise<string | null>;
  resolveDetailed?(
    input: ChannelIdentityInput,
  ): Promise<ResolvedChannelIdentity | null>;
}

/** Safe default before DB — no automatic linking. */
export class NullChannelIdentityResolver implements ChannelIdentityResolver {
  async resolve(input: ChannelIdentityInput): Promise<string | null> {
    void input;
    return null;
  }
}

/** Test-only in-memory map. Never use in production routes. */
export class FakeChannelIdentityResolver implements ChannelIdentityResolver {
  private readonly map = new Map<string, ResolvedChannelIdentity>();

  seed(
    channel: ConversationChannel,
    externalSenderId: string,
    userId: string,
    identityId = `id_${userId.slice(0, 8)}`,
  ) {
    this.map.set(`${channel}:${externalSenderId}`, { userId, identityId });
  }

  revoke(channel: ConversationChannel, externalSenderId: string) {
    this.map.delete(`${channel}:${externalSenderId}`);
  }

  async resolve(input: ChannelIdentityInput): Promise<string | null> {
    return (await this.resolveDetailed(input))?.userId ?? null;
  }

  async resolveDetailed(
    input: ChannelIdentityInput,
  ): Promise<ResolvedChannelIdentity | null> {
    return this.map.get(`${input.channel}:${input.externalSenderId}`) ?? null;
  }
}

/** Production resolver — active WhatsApp identities only. */
export class SupabaseChannelIdentityResolver implements ChannelIdentityResolver {
  async resolve(input: ChannelIdentityInput): Promise<string | null> {
    return (await this.resolveDetailed(input))?.userId ?? null;
  }

  async resolveDetailed(
    input: ChannelIdentityInput,
  ): Promise<ResolvedChannelIdentity | null> {
    if (input.channel !== "whatsapp") return null;
    const externalId = input.externalSenderId?.trim();
    if (!externalId) return null;

    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("user_channel_identities")
        .select("id, user_id")
        .eq("channel", "whatsapp")
        .eq("external_id", externalId)
        .eq("status", "active")
        .maybeSingle();

      if (error || !data?.user_id || !data?.id) return null;
      return {
        userId: data.user_id as string,
        identityId: data.id as string,
      };
    } catch {
      return null;
    }
  }
}

export const defaultWhatsAppIdentityResolver =
  new SupabaseChannelIdentityResolver();

export async function getActiveWhatsAppIdentityForUser(
  userId: string,
): Promise<{ identityId: string; verifiedAt: string | null } | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_channel_identities")
      .select("id, verified_at")
      .eq("user_id", userId)
      .eq("channel", "whatsapp")
      .eq("status", "active")
      .maybeSingle();
    if (error || !data?.id) return null;
    return {
      identityId: data.id as string,
      verifiedAt: (data.verified_at as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function revokeWhatsAppIdentityForUser(
  userId: string,
): Promise<{ revoked: boolean; identityId?: string }> {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data: existing } = await admin
      .from("user_channel_identities")
      .select("id")
      .eq("user_id", userId)
      .eq("channel", "whatsapp")
      .eq("status", "active")
      .maybeSingle();

    if (!existing?.id) return { revoked: false };

    await admin
      .from("user_channel_identities")
      .update({
        status: "revoked",
        revoked_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .eq("status", "active");

    await admin
      .from("whatsapp_outbound_messages")
      .update({
        status: "cancelled",
        updated_at: nowIso,
        error_code: "identity_revoked",
      })
      .eq("identity_id", existing.id)
      .in("status", ["pending", "retry", "sending"]);

    return { revoked: true, identityId: existing.id as string };
  } catch {
    return { revoked: false };
  }
}
