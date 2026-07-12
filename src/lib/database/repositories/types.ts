import type { BiblicalReference } from "@/lib/biblical";
import type { PreferredDepth, ResponseStyle, TraditionKey } from "@/lib/theology";
import type { FeatureType } from "@/lib/usage";
import type { PlanKey } from "@/lib/entitlements";

export interface SpiritualProfileRecord {
  userId: string;
  traditionKey: TraditionKey;
  denomination: string | null;
  preferredBibleTranslation: string | null;
  responseStyle: ResponseStyle;
  preferredDepth: PreferredDepth;
  saintsContentEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  personaKey: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  biblicalReferences: BiblicalReference[];
  requestId: string | null;
  createdAt: string;
}

export interface ConversationSummaryRecord {
  conversationId: string;
  userId: string;
  summary: string;
}

export interface UsageEventInput {
  userId: string;
  subscriptionId?: string | null;
  conversationId?: string | null;
  requestId: string;
  featureType: FeatureType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsdMicros: number;
  estimatedCostBrlCents: number;
  latencyMs: number;
  success: boolean;
}

export interface UsageMonthlyRecord {
  userId: string;
  yearMonth: string;
  usedBrlCents: number;
  requestCount: number;
}

export interface SpiritualProfileRepository {
  getByUserId(userId: string): Promise<SpiritualProfileRecord | null>;
  upsert(
    profile: SpiritualProfileRecord,
  ): Promise<SpiritualProfileRecord>;
}

export interface ConversationRepository {
  getByIdForUser(
    conversationId: string,
    userId: string,
  ): Promise<ConversationRecord | null>;
  listForUser(userId: string, limit?: number): Promise<ConversationRecord[]>;
  create(input: {
    userId: string;
    personaKey: string;
    title?: string;
  }): Promise<ConversationRecord>;
}

export interface MessageRepository {
  listRecent(
    conversationId: string,
    userId: string,
    limit: number,
  ): Promise<MessageRecord[]>;
  /** Returns existing message if request_id already stored (idempotent). */
  findByRequestId(
    userId: string,
    requestId: string,
    role: "user" | "assistant",
  ): Promise<MessageRecord | null>;
  insertUserMessage(input: {
    conversationId: string;
    userId: string;
    content: string;
    requestId: string;
  }): Promise<MessageRecord>;
  insertAssistantMessage(input: {
    conversationId: string;
    userId: string;
    content: string;
    biblicalReferences: BiblicalReference[];
    requestId: string;
  }): Promise<MessageRecord>;
}

export interface ConversationSummaryRepository {
  get(
    conversationId: string,
    userId: string,
  ): Promise<ConversationSummaryRecord | null>;
  upsert(input: ConversationSummaryRecord): Promise<void>;
}

export interface UsageRepository {
  findEventByRequestId(
    userId: string,
    requestId: string,
  ): Promise<{ id: string } | null>;
  insertEvent(input: UsageEventInput): Promise<{ inserted: boolean }>;
  getMonthly(userId: string, yearMonth: string): Promise<UsageMonthlyRecord>;
  incrementMonthly(input: {
    userId: string;
    yearMonth: string;
    addBrlCents: number;
  }): Promise<UsageMonthlyRecord>;
  countRequestsSince(userId: string, sinceIso: string): Promise<number>;
}

export interface DataRepositories {
  spiritualProfiles: SpiritualProfileRepository;
  conversations: ConversationRepository;
  messages: MessageRepository;
  summaries: ConversationSummaryRepository;
  usage: UsageRepository;
}

export type { PlanKey };
