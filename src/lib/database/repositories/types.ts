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

/** Spiritual profile plus timestamps for owner data export. */
export interface SpiritualProfileExportRecord extends SpiritualProfileRecord {
  createdAt: string | null;
  updatedAt: string | null;
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

/** Lightweight usage event fields for owner export summaries (no model/token dump). */
export interface UsageEventExportRecord {
  featureType: FeatureType;
  estimatedCostBrlCents: number;
  success: boolean;
  createdAt: string;
}

export type UsageMonthlyExportRecord = UsageMonthlyRecord;

export interface SpiritualProfileRepository {
  getByUserId(userId: string): Promise<SpiritualProfileRecord | null>;
  /** Owner export snapshot including created/updated timestamps. */
  getForExport(userId: string): Promise<SpiritualProfileExportRecord | null>;
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
  /**
   * Stable-ordered page for owner export.
   * Order: created_at ASC, id ASC. Caller assembles pages; never silent-truncate.
   */
  listPageForExport(
    userId: string,
    from: number,
    to: number,
  ): Promise<ConversationRecord[]>;
  create(input: {
    userId: string;
    personaKey: string;
    title?: string;
  }): Promise<ConversationRecord>;
  /** Bump activity timestamp for ownership-validated conversation. */
  touchForUser(conversationId: string, userId: string): Promise<void>;
}

export interface MessageRepository {
  listRecent(
    conversationId: string,
    userId: string,
    limit: number,
  ): Promise<MessageRecord[]>;
  /**
   * Stable-ordered page for owner export (chronological).
   * Order: created_at ASC, id ASC. Only user/assistant roles.
   */
  listPageForExport(
    conversationId: string,
    userId: string,
    from: number,
    to: number,
  ): Promise<MessageRecord[]>;
  /** Latest user message only — for resume previews (no full history). */
  findLatestUserMessage(
    conversationId: string,
    userId: string,
  ): Promise<Pick<MessageRecord, "content" | "createdAt"> | null>;
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
  /** Count user messages (one per requestId) since timestamp — short-term rate limits. */
  countUserMessagesSince(userId: string, sinceIso: string): Promise<number>;
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
  /** All monthly usage rows for the owner, year_month ASC. */
  listMonthlyForExport(userId: string): Promise<UsageMonthlyExportRecord[]>;
  /**
   * Lightweight usage event page for owner export summaries.
   * Order: created_at ASC, id ASC.
   */
  listEventPageForExport(
    userId: string,
    from: number,
    to: number,
  ): Promise<UsageEventExportRecord[]>;
}

export interface DataRepositories {
  spiritualProfiles: SpiritualProfileRepository;
  conversations: ConversationRepository;
  messages: MessageRepository;
  summaries: ConversationSummaryRepository;
  usage: UsageRepository;
}

export type { PlanKey };
