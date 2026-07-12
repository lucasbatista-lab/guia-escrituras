import "server-only";

import type { BiblicalReference } from "@/lib/biblical";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/safety";
import type {
  ConversationRecord,
  ConversationRepository,
  ConversationSummaryRecord,
  ConversationSummaryRepository,
  DataRepositories,
  MessageRecord,
  MessageRepository,
  SpiritualProfileRecord,
  SpiritualProfileRepository,
  UsageEventInput,
  UsageMonthlyRecord,
  UsageRepository,
} from "./types";

function mapSpiritual(row: Record<string, unknown>): SpiritualProfileRecord {
  return {
    userId: row.user_id as string,
    traditionKey: row.tradition_key as SpiritualProfileRecord["traditionKey"],
    denomination: (row.denomination as string | null) ?? null,
    preferredBibleTranslation:
      (row.preferred_bible_translation as string | null) ?? null,
    responseStyle: row.response_style as SpiritualProfileRecord["responseStyle"],
    preferredDepth: row.preferred_depth as SpiritualProfileRecord["preferredDepth"],
    saintsContentEnabled: Boolean(row.saints_content_enabled),
    onboardingCompleted: Boolean(row.onboarding_completed),
  };
}

function mapConversation(row: Record<string, unknown>): ConversationRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    personaKey: (row.persona_key as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMessage(row: Record<string, unknown>): MessageRecord {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    userId: row.user_id as string,
    role: row.role as MessageRecord["role"],
    content: row.content as string,
    biblicalReferences: (row.biblical_references as BiblicalReference[]) ?? [],
    requestId: (row.request_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

async function userClient() {
  const client = await createClient();
  if (!client) {
    throw new AppError(
      "supabase_unavailable",
      "supabase_unavailable",
      503,
      "Serviço temporariamente indisponível.",
    );
  }
  return client;
}

class SupabaseSpiritualProfiles implements SpiritualProfileRepository {
  async getByUserId(userId: string) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("spiritual_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao carregar perfil.");
    }
    return data ? mapSpiritual(data) : null;
  }

  async upsert(profile: SpiritualProfileRecord) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("spiritual_profiles")
      .upsert({
        user_id: profile.userId,
        tradition_key: profile.traditionKey,
        denomination: profile.denomination,
        preferred_bible_translation: profile.preferredBibleTranslation,
        response_style: profile.responseStyle,
        preferred_depth: profile.preferredDepth,
        saints_content_enabled: profile.saintsContentEnabled,
        onboarding_completed: profile.onboardingCompleted,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(
        error?.message ?? "upsert failed",
        "db_error",
        500,
        "Não foi possível salvar o perfil espiritual.",
      );
    }
    return mapSpiritual(data);
  }
}

class SupabaseConversations implements ConversationRepository {
  async getByIdForUser(conversationId: string, userId: string) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao carregar conversa.");
    }
    return data ? mapConversation(data) : null;
  }

  async listForUser(userId: string, limit = 50) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao listar conversas.");
    }
    return (data ?? []).map(mapConversation);
  }

  async create(input: { userId: string; personaKey: string; title?: string }) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: input.userId,
        persona_key: input.personaKey,
        title: input.title ?? null,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(
        error?.message ?? "insert failed",
        "db_error",
        500,
        "Não foi possível criar a conversa.",
      );
    }
    return mapConversation(data);
  }
}

class SupabaseMessages implements MessageRepository {
  async listRecent(conversationId: string, userId: string, limit: number) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao carregar mensagens.");
    }
    return (data ?? []).map(mapMessage).reverse();
  }

  async findByRequestId(
    userId: string,
    requestId: string,
    role: "user" | "assistant",
  ) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .eq("request_id", requestId)
      .eq("role", role)
      .maybeSingle();
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao verificar mensagem.");
    }
    return data ? mapMessage(data) : null;
  }

  async insertUserMessage(input: {
    conversationId: string;
    userId: string;
    content: string;
    requestId: string;
  }) {
    const existing = await this.findByRequestId(
      input.userId,
      input.requestId,
      "user",
    );
    if (existing) return existing;

    // User-role insert via authenticated client (RLS after migration 004).
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        user_id: input.userId,
        role: "user",
        content: input.content,
        request_id: input.requestId,
        biblical_references: [],
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      const again = await this.findByRequestId(
        input.userId,
        input.requestId,
        "user",
      );
      if (again) return again;
    }

    if (error || !data) {
      throw new AppError(
        error?.message ?? "insert failed",
        "db_error",
        500,
        "Não foi possível salvar sua mensagem.",
      );
    }
    return mapMessage(data);
  }

  async insertAssistantMessage(input: {
    conversationId: string;
    userId: string;
    content: string;
    biblicalReferences: BiblicalReference[];
    requestId: string;
  }) {
    const existing = await this.findByRequestId(
      input.userId,
      input.requestId,
      "assistant",
    );
    if (existing) return existing;

    // Assistant messages require trusted backend (admin client) after migration 004.
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        user_id: input.userId,
        role: "assistant",
        content: input.content,
        request_id: input.requestId,
        biblical_references: input.biblicalReferences,
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      const again = await this.findByRequestId(
        input.userId,
        input.requestId,
        "assistant",
      );
      if (again) return again;
    }

    if (error || !data) {
      throw new AppError(
        error?.message ?? "insert failed",
        "partial_persist",
        500,
        "A resposta foi gerada, mas não pôde ser salva completamente.",
      );
    }
    return mapMessage(data);
  }
}

class SupabaseSummaries implements ConversationSummaryRepository {
  async get(conversationId: string, userId: string) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("conversation_summaries")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao carregar resumo.");
    }
    if (!data) return null;
    return {
      conversationId: data.conversation_id as string,
      userId: data.user_id as string,
      summary: data.summary as string,
    };
  }

  async upsert(input: ConversationSummaryRecord) {
    const admin = createAdminClient();
    const { error } = await admin.from("conversation_summaries").upsert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      summary: input.summary,
    });
    if (error) {
      throw new AppError(
        error.message,
        "partial_persist",
        500,
        "Não foi possível atualizar o resumo da conversa.",
      );
    }
  }
}

class SupabaseUsage implements UsageRepository {
  async findEventByRequestId(userId: string, requestId: string) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("usage_events")
      .select("id")
      .eq("user_id", userId)
      .eq("request_id", requestId)
      .maybeSingle();
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao verificar uso.");
    }
    return data ? { id: data.id as string } : null;
  }

  async insertEvent(input: UsageEventInput) {
    const existing = await this.findEventByRequestId(
      input.userId,
      input.requestId,
    );
    if (existing) return { inserted: false };

    const admin = createAdminClient();
    const { error } = await admin.from("usage_events").insert({
      user_id: input.userId,
      subscription_id: input.subscriptionId ?? null,
      conversation_id: input.conversationId ?? null,
      request_id: input.requestId,
      feature_type: input.featureType,
      model: input.model,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      estimated_cost_usd_micros: input.estimatedCostUsdMicros,
      estimated_cost_brl_cents: input.estimatedCostBrlCents,
      latency_ms: input.latencyMs,
      success: input.success,
    });

    if (error?.code === "23505") {
      return { inserted: false };
    }
    if (error) {
      throw new AppError(
        error.message,
        "partial_persist",
        500,
        "A conversa ocorreu, mas o registro de uso falhou.",
      );
    }
    return { inserted: true };
  }

  async getMonthly(userId: string, yearMonth: string): Promise<UsageMonthlyRecord> {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("usage_monthly")
      .select("*")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle();
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao carregar uso mensal.");
    }
    if (!data) {
      return { userId, yearMonth, usedBrlCents: 0, requestCount: 0 };
    }
    return {
      userId,
      yearMonth,
      usedBrlCents: data.used_brl_cents as number,
      requestCount: data.request_count as number,
    };
  }

  async incrementMonthly(input: {
    userId: string;
    yearMonth: string;
    addBrlCents: number;
  }) {
    const admin = createAdminClient();
    const current = await this.getMonthly(input.userId, input.yearMonth);
    const next = {
      used_brl_cents: current.usedBrlCents + input.addBrlCents,
      request_count: current.requestCount + 1,
    };

    const { data, error } = await admin
      .from("usage_monthly")
      .upsert({
        user_id: input.userId,
        year_month: input.yearMonth,
        ...next,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(
        error?.message ?? "upsert failed",
        "partial_persist",
        500,
        "Falha ao atualizar o uso mensal.",
      );
    }

    return {
      userId: input.userId,
      yearMonth: input.yearMonth,
      usedBrlCents: data.used_brl_cents as number,
      requestCount: data.request_count as number,
    };
  }

  async countRequestsSince(userId: string, sinceIso: string) {
    const supabase = await userClient();
    const { count, error } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sinceIso);
    if (error) {
      throw new AppError(error.message, "db_error", 500, "Erro ao verificar limite diário.");
    }
    return count ?? 0;
  }
}

export function createSupabaseRepositories(): DataRepositories {
  return {
    spiritualProfiles: new SupabaseSpiritualProfiles(),
    conversations: new SupabaseConversations(),
    messages: new SupabaseMessages(),
    summaries: new SupabaseSummaries(),
    usage: new SupabaseUsage(),
  };
}
