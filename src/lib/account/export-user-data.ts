import "server-only";

import {
  USER_DATA_EXPORT_NOTES,
  USER_DATA_EXPORT_VERSION,
  type UserDataExportAcquisition,
  type UserDataExportConversation,
  type UserDataExportDocument,
  type UserDataExportMessage,
  type UserDataExportReferral,
  type UserDataExportSubscription,
  type UserDataExportUsageSummary,
} from "@/lib/account/export-types";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import { getRepositories } from "@/lib/database/repositories";
import type {
  ConversationRecord,
  DataRepositories,
  MessageRecord,
  UsageEventExportRecord,
} from "@/lib/database/repositories/types";
import { getPlanByKey } from "@/lib/entitlements";
import { getLegalConsentRepository } from "@/lib/legal/consent";
import { maskStripeId } from "@/lib/logging/mask";
import { AppError } from "@/lib/safety";
import { getSignupIntentRepository } from "@/lib/signup-intents/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Defensive page size under PostgREST silent truncation threshold. */
export const USER_DATA_EXPORT_PAGE_SIZE = 500;

/**
 * Max pages per collection. Hitting this returns an explicit error —
 * never a silently truncated success payload.
 */
export const USER_DATA_EXPORT_MAX_PAGES = 200;

let pageSizeOverride: number | null = null;
let maxPagesOverride: number | null = null;

export function setUserDataExportPaginationForTests(
  options: { pageSize?: number; maxPages?: number } | null,
): void {
  pageSizeOverride = options?.pageSize ?? null;
  maxPagesOverride = options?.maxPages ?? null;
}

function exportPageSize(): number {
  return pageSizeOverride ?? USER_DATA_EXPORT_PAGE_SIZE;
}

function exportMaxPages(): number {
  return maxPagesOverride ?? USER_DATA_EXPORT_MAX_PAGES;
}

export function buildExportFilename(generatedAt: Date = new Date()): string {
  const yyyy = generatedAt.getUTCFullYear();
  const mm = String(generatedAt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(generatedAt.getUTCDate()).padStart(2, "0");
  return `amem-chat-meus-dados-${yyyy}-${mm}-${dd}.json`;
}

async function collectPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  label: string,
): Promise<T[]> {
  const pageSize = exportPageSize();
  const maxPages = exportMaxPages();
  const rows: T[] = [];
  let from = 0;
  let pagesRead = 0;

  while (pagesRead < maxPages) {
    const to = from + pageSize - 1;
    const page = await fetchPage(from, to);
    pagesRead += 1;
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
    from += pageSize;
  }

  throw new AppError(
    `export_too_large:${label}`,
    "export_too_large",
    413,
    "Seus dados são muito volumosos para exportar automaticamente agora. Fale com o suporte para receber uma cópia completa.",
  );
}

async function loadProfileRow(userId: string): Promise<{
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return {
        displayName: null,
        avatarUrl: null,
        createdAt: null,
        updatedAt: null,
      };
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      return {
        displayName: null,
        avatarUrl: null,
        createdAt: null,
        updatedAt: null,
      };
    }
    return {
      displayName: (data.display_name as string | null) ?? null,
      avatarUrl: (data.avatar_url as string | null) ?? null,
      createdAt: (data.created_at as string | null) ?? null,
      updatedAt: (data.updated_at as string | null) ?? null,
    };
  } catch {
    return {
      displayName: null,
      avatarUrl: null,
      createdAt: null,
      updatedAt: null,
    };
  }
}

function mapExportMessage(row: MessageRecord): UserDataExportMessage | null {
  if (row.role !== "user" && row.role !== "assistant") return null;
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    biblicalReferences: row.biblicalReferences ?? [],
    createdAt: row.createdAt,
  };
}

async function loadConversationsForExport(
  userId: string,
  repos: DataRepositories,
): Promise<UserDataExportConversation[]> {
  const conversations = await collectPages<ConversationRecord>(
    (from, to) => repos.conversations.listPageForExport(userId, from, to),
    "conversations",
  );

  const out: UserDataExportConversation[] = [];
  for (const conversation of conversations) {
    if (conversation.userId !== userId) {
      throw new AppError(
        "export_ownership_violation",
        "export_failed",
        500,
        "Não foi possível preparar seus dados. Tente novamente em instantes.",
      );
    }
    const messageRows = await collectPages<MessageRecord>(
      (from, to) =>
        repos.messages.listPageForExport(conversation.id, userId, from, to),
      `messages:${conversation.id}`,
    );
    const messages: UserDataExportMessage[] = [];
    for (const row of messageRows) {
      if (row.userId !== userId || row.conversationId !== conversation.id) {
        throw new AppError(
          "export_ownership_violation",
          "export_failed",
          500,
          "Não foi possível preparar seus dados. Tente novamente em instantes.",
        );
      }
      const mapped = mapExportMessage(row);
      if (mapped) messages.push(mapped);
    }
    out.push({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages,
    });
  }
  return out;
}

function summarizeUsageFromEvents(
  events: UsageEventExportRecord[],
  sinceIso: string,
): Omit<UserDataExportUsageSummary, "monthly"> {
  let totalRequests = 0;
  let standardRequests = 0;
  let deepRequests = 0;
  let estimatedCostBrlCentsTotal = 0;
  let last30Total = 0;
  let last30Standard = 0;
  let last30Deep = 0;
  let last30Cost = 0;

  for (const event of events) {
    if (!event.success) continue;
    totalRequests += 1;
    estimatedCostBrlCentsTotal += event.estimatedCostBrlCents;
    if (event.featureType === "chat_deep") deepRequests += 1;
    else if (event.featureType === "chat_standard") standardRequests += 1;

    if (event.createdAt >= sinceIso) {
      last30Total += 1;
      last30Cost += event.estimatedCostBrlCents;
      if (event.featureType === "chat_deep") last30Deep += 1;
      else if (event.featureType === "chat_standard") last30Standard += 1;
    }
  }

  return {
    totalRequests,
    standardRequests,
    deepRequests,
    estimatedCostBrlCentsTotal,
    last30Days: {
      since: sinceIso,
      totalRequests: last30Total,
      standardRequests: last30Standard,
      deepRequests: last30Deep,
      estimatedCostBrlCents: last30Cost,
    },
  };
}

async function loadUsageSummary(
  userId: string,
  repos: DataRepositories,
  generatedAt: Date,
): Promise<UserDataExportUsageSummary> {
  const since = new Date(generatedAt.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const [monthly, events] = await Promise.all([
    repos.usage.listMonthlyForExport(userId),
    collectPages<UsageEventExportRecord>(
      (from, to) => repos.usage.listEventPageForExport(userId, from, to),
      "usage_events",
    ),
  ]);

  const summary = summarizeUsageFromEvents(events, sinceIso);

  return {
    ...summary,
    monthly: monthly.map((row) => ({
      yearMonth: row.yearMonth,
      usedBrlCents: row.usedBrlCents,
      requestCount: row.requestCount,
    })),
  };
}

async function loadAcquisition(
  userId: string,
): Promise<UserDataExportAcquisition> {
  const intents = await getSignupIntentRepository().listByUserId(userId);
  const primary =
    intents.find((row) => row.status === "completed") ?? intents[0] ?? null;

  if (!primary) {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      referralCode: null,
      attributedAt: null,
      signupIntent: null,
    };
  }

  return {
    utmSource: primary.utmSource,
    utmMedium: primary.utmMedium,
    utmCampaign: primary.utmCampaign,
    utmContent: primary.utmContent,
    utmTerm: primary.utmTerm,
    referralCode: primary.referralCode,
    attributedAt: primary.completedAt ?? primary.createdAt,
    signupIntent: {
      id: primary.id,
      selectedPlanKey: primary.selectedPlanKey,
      status: primary.status,
      termsVersion: primary.termsVersion,
      privacyVersion: primary.privacyVersion,
      termsAcceptedAt: primary.termsAcceptedAt,
      checkoutCreatedAt: primary.checkoutCreatedAt,
      completedAt: primary.completedAt,
      createdAt: primary.createdAt,
      updatedAt: primary.updatedAt,
    },
  };
}

async function loadSubscription(
  userId: string,
): Promise<UserDataExportSubscription | null> {
  const rows = await loadUserSubscriptions(userId);
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    const byCreated = a.createdAt.localeCompare(b.createdAt);
    if (byCreated !== 0) return byCreated;
    return a.id.localeCompare(b.id);
  });
  const primary = sorted[sorted.length - 1]!;
  const plan = getPlanByKey(primary.planKey);

  return {
    planKey: primary.planKey,
    planName: plan?.name ?? primary.planKey,
    status: primary.status,
    currency: "BRL",
    periodicity: "monthly",
    priceMonthlyCents: plan?.priceMonthlyCents ?? null,
    currentPeriodEnd: primary.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: null,
    trial: primary.status === "trialing",
    createdAt: primary.createdAt,
    updatedAt: null,
    providerCustomerIdMasked: maskStripeId(primary.stripeCustomerId) ?? null,
    providerSubscriptionIdMasked:
      maskStripeId(primary.stripeSubscriptionId) ?? null,
  };
}

async function loadReferrals(userId: string): Promise<UserDataExportReferral> {
  const empty: UserDataExportReferral = {
    ownCode: null,
    attributionAsReferred: null,
    rewardsAsReferrer: [],
  };

  try {
    const supabase = await createClient();
    const admin = (() => {
      try {
        return createAdminClient();
      } catch {
        return null;
      }
    })();
    const client = supabase ?? admin;
    if (!client) return empty;

    const [{ data: codeRow }, { data: asReferred }, { data: asReferrer }] =
      await Promise.all([
        client
          .from("referral_codes")
          .select("code, active")
          .eq("owner_user_id", userId)
          .maybeSingle(),
        client
          .from("referral_attributions")
          .select("referral_code, status, created_at, updated_at")
          .eq("referred_user_id", userId)
          .maybeSingle(),
        client
          .from("referral_attributions")
          .select("referral_code, status, created_at, updated_at")
          .eq("referrer_user_id", userId)
          .order("created_at", { ascending: true }),
      ]);

    return {
      ownCode:
        codeRow?.active === false
          ? null
          : ((codeRow?.code as string | null) ?? null),
      attributionAsReferred: asReferred
        ? {
            referralCode: asReferred.referral_code as string,
            status: asReferred.status as string,
            createdAt: (asReferred.created_at as string | null) ?? null,
            updatedAt: (asReferred.updated_at as string | null) ?? null,
          }
        : null,
      rewardsAsReferrer: (asReferrer ?? []).map((row) => ({
        referralCode: row.referral_code as string,
        status: row.status as string,
        createdAt: (row.created_at as string | null) ?? null,
        updatedAt: (row.updated_at as string | null) ?? null,
      })),
    };
  } catch {
    return empty;
  }
}

export interface BuildUserDataExportInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  email: string | null;
  /** Optional override for tests. */
  repos?: DataRepositories;
  now?: Date;
}

/**
 * Builds a complete owner data export for the authenticated userId only.
 * Fails explicitly if volume exceeds safe page caps — never returns a partial file as success.
 */
export async function buildUserDataExport(
  input: BuildUserDataExportInput,
): Promise<{ document: UserDataExportDocument; filename: string }> {
  const userId = input.userId;
  if (!userId?.trim()) {
    throw new AppError(
      "unauthenticated",
      "unauthenticated",
      401,
      "Faça login para continuar.",
    );
  }

  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const repos = input.repos ?? getRepositories();

  const [
    profile,
    spiritual,
    consents,
    acquisition,
    subscription,
    conversations,
    usageSummary,
    referrals,
  ] = await Promise.all([
    loadProfileRow(userId),
    repos.spiritualProfiles.getForExport(userId),
    getLegalConsentRepository().listByUserId(userId),
    loadAcquisition(userId),
    loadSubscription(userId),
    loadConversationsForExport(userId, repos),
    loadUsageSummary(userId, repos, now),
    loadReferrals(userId),
  ]);

  const document: UserDataExportDocument = {
    exportVersion: USER_DATA_EXPORT_VERSION,
    generatedAt,
    account: {
      id: userId,
      displayName: profile.displayName,
      email: input.email,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      onboardingCompleted: spiritual?.onboardingCompleted ?? false,
    },
    spiritualProfile: spiritual
      ? {
          traditionKey: spiritual.traditionKey,
          denomination: spiritual.denomination,
          preferredBibleTranslation: spiritual.preferredBibleTranslation,
          responseStyle: spiritual.responseStyle,
          preferredDepth: spiritual.preferredDepth,
          saintsContentEnabled: spiritual.saintsContentEnabled,
          onboardingCompleted: spiritual.onboardingCompleted,
          createdAt: spiritual.createdAt,
          updatedAt: spiritual.updatedAt,
        }
      : null,
    legalConsents: consents.map((row) => ({
      termsVersion: row.termsVersion,
      privacyVersion: row.privacyVersion,
      acceptedAt: row.acceptedAt,
      source: row.source,
      createdAt: row.createdAt ?? null,
    })),
    acquisition,
    subscription,
    conversations,
    usageSummary,
    referrals,
    notes: [...USER_DATA_EXPORT_NOTES],
  };

  return {
    document,
    filename: buildExportFilename(now),
  };
}

export function serializeUserDataExport(
  document: UserDataExportDocument,
): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}
