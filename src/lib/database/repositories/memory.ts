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

const spiritualStore = new Map<string, SpiritualProfileRecord>();
const conversations = new Map<string, ConversationRecord>();
const messages = new Map<string, MessageRecord[]>();
const summaries = new Map<string, ConversationSummaryRecord>();
const usageEvents = new Map<string, UsageEventInput & { id: string }>();
const usageMonthly = new Map<string, UsageMonthlyRecord>();

function monthlyKey(userId: string, yearMonth: string) {
  return `${userId}:${yearMonth}`;
}

class MemorySpiritualProfiles implements SpiritualProfileRepository {
  async getByUserId(userId: string) {
    return spiritualStore.get(userId) ?? null;
  }

  async upsert(profile: SpiritualProfileRecord) {
    spiritualStore.set(profile.userId, profile);
    return profile;
  }
}

class MemoryConversations implements ConversationRepository {
  async getByIdForUser(conversationId: string, userId: string) {
    const row = conversations.get(conversationId);
    if (!row || row.userId !== userId) return null;
    return row;
  }

  async listForUser(userId: string, limit = 50) {
    return Array.from(conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  async create(input: { userId: string; personaKey: string; title?: string }) {
    const now = new Date().toISOString();
    const row: ConversationRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      personaKey: input.personaKey,
      title: input.title ?? null,
      createdAt: now,
      updatedAt: now,
    };
    conversations.set(row.id, row);
    messages.set(row.id, []);
    return row;
  }
}

class MemoryMessages implements MessageRepository {
  async listRecent(conversationId: string, userId: string, limit: number) {
    const list = (messages.get(conversationId) ?? []).filter(
      (m) => m.userId === userId,
    );
    return list.slice(-limit);
  }

  async findByRequestId(
    userId: string,
    requestId: string,
    role: "user" | "assistant",
  ) {
    for (const list of messages.values()) {
      const found = list.find(
        (m) =>
          m.userId === userId &&
          m.requestId === requestId &&
          m.role === role,
      );
      if (found) return found;
    }
    return null;
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

    const row: MessageRecord = {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      userId: input.userId,
      role: "user",
      content: input.content,
      biblicalReferences: [],
      requestId: input.requestId,
      createdAt: new Date().toISOString(),
    };
    const list = messages.get(input.conversationId) ?? [];
    list.push(row);
    messages.set(input.conversationId, list);
    return row;
  }

  async insertAssistantMessage(input: {
    conversationId: string;
    userId: string;
    content: string;
    biblicalReferences: MessageRecord["biblicalReferences"];
    requestId: string;
  }) {
    const existing = await this.findByRequestId(
      input.userId,
      input.requestId,
      "assistant",
    );
    if (existing) return existing;

    const row: MessageRecord = {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      userId: input.userId,
      role: "assistant",
      content: input.content,
      biblicalReferences: input.biblicalReferences,
      requestId: input.requestId,
      createdAt: new Date().toISOString(),
    };
    const list = messages.get(input.conversationId) ?? [];
    list.push(row);
    messages.set(input.conversationId, list);
    return row;
  }
}

class MemorySummaries implements ConversationSummaryRepository {
  async get(conversationId: string, userId: string) {
    const row = summaries.get(conversationId);
    if (!row || row.userId !== userId) return null;
    return row;
  }

  async upsert(input: ConversationSummaryRecord) {
    summaries.set(input.conversationId, input);
  }
}

class MemoryUsage implements UsageRepository {
  async findEventByRequestId(userId: string, requestId: string) {
    const key = `${userId}:${requestId}`;
    const row = usageEvents.get(key);
    return row ? { id: row.id } : null;
  }

  async insertEvent(input: UsageEventInput) {
    const key = `${input.userId}:${input.requestId}`;
    if (usageEvents.has(key)) {
      return { inserted: false };
    }
    usageEvents.set(key, { ...input, id: crypto.randomUUID() });
    return { inserted: true };
  }

  async getMonthly(userId: string, yearMonth: string) {
    return (
      usageMonthly.get(monthlyKey(userId, yearMonth)) ?? {
        userId,
        yearMonth,
        usedBrlCents: 0,
        requestCount: 0,
      }
    );
  }

  async incrementMonthly(input: {
    userId: string;
    yearMonth: string;
    addBrlCents: number;
  }) {
    const current = await this.getMonthly(input.userId, input.yearMonth);
    const next = {
      ...current,
      usedBrlCents: current.usedBrlCents + input.addBrlCents,
      requestCount: current.requestCount + 1,
    };
    usageMonthly.set(monthlyKey(input.userId, input.yearMonth), next);
    return next;
  }

  async countRequestsSince(userId: string, sinceIso: string) {
    let count = 0;
    for (const event of usageEvents.values()) {
      if (event.userId === userId) {
        // Memory store has no createdAt on events; approximate via success flag usage
        void sinceIso;
        count += 1;
      }
    }
    return count;
  }
}

export function createMemoryRepositories(): DataRepositories {
  return {
    spiritualProfiles: new MemorySpiritualProfiles(),
    conversations: new MemoryConversations(),
    messages: new MemoryMessages(),
    summaries: new MemorySummaries(),
    usage: new MemoryUsage(),
  };
}
