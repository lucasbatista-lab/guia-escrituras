import type { BiblicalReference } from "@/lib/biblical";
import type { PlanKey } from "@/lib/entitlements";
import type {
  PreferredDepth,
  ResponseStyle,
  TraditionKey,
} from "@/lib/theology";

/** Stable format version for owner self-service export. */
export const USER_DATA_EXPORT_VERSION = "amem-chat-user-data-v1" as const;

export type UserDataExportVersion = typeof USER_DATA_EXPORT_VERSION;

export interface UserDataExportAccount {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  onboardingCompleted: boolean;
}

export interface UserDataExportSpiritualProfile {
  traditionKey: TraditionKey;
  denomination: string | null;
  preferredBibleTranslation: string | null;
  responseStyle: ResponseStyle;
  preferredDepth: PreferredDepth;
  saintsContentEnabled: boolean;
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserDataExportLegalConsent {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  source: string;
  createdAt: string | null;
}

export interface UserDataExportAcquisition {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referralCode: string | null;
  attributedAt: string | null;
  signupIntent: {
    id: string;
    selectedPlanKey: PlanKey;
    status: string;
    termsVersion: string | null;
    privacyVersion: string | null;
    termsAcceptedAt: string | null;
    checkoutCreatedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface UserDataExportSubscription {
  planKey: PlanKey;
  planName: string;
  status: string;
  currency: "BRL";
  periodicity: "monthly";
  priceMonthlyCents: number | null;
  currentPeriodEnd: string | null;
  /** Not persisted locally today; live on the payment provider. */
  cancelAtPeriodEnd: null;
  trial: boolean;
  createdAt: string;
  updatedAt: string | null;
  /** Masked provider ids — never full secrets or payment methods. */
  providerCustomerIdMasked: string | null;
  providerSubscriptionIdMasked: string | null;
}

export interface UserDataExportMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  biblicalReferences: BiblicalReference[];
  createdAt: string;
}

export interface UserDataExportConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: UserDataExportMessage[];
}

export interface UserDataExportUsageSummary {
  totalRequests: number;
  standardRequests: number;
  deepRequests: number;
  /** Aggregate of stored estimates only — labeled as estimate. */
  estimatedCostBrlCentsTotal: number;
  last30Days: {
    since: string;
    totalRequests: number;
    standardRequests: number;
    deepRequests: number;
    estimatedCostBrlCents: number;
  };
  monthly: Array<{
    yearMonth: string;
    usedBrlCents: number;
    requestCount: number;
  }>;
}

export interface UserDataExportReferral {
  ownCode: string | null;
  attributionAsReferred: {
    referralCode: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  rewardsAsReferrer: Array<{
    referralCode: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
}

export interface UserDataExportDocument {
  exportVersion: UserDataExportVersion;
  generatedAt: string;
  account: UserDataExportAccount;
  spiritualProfile: UserDataExportSpiritualProfile | null;
  legalConsents: UserDataExportLegalConsent[];
  acquisition: UserDataExportAcquisition;
  subscription: UserDataExportSubscription | null;
  conversations: UserDataExportConversation[];
  usageSummary: UserDataExportUsageSummary;
  referrals: UserDataExportReferral;
  notes: string[];
}

export const USER_DATA_EXPORT_NOTES: string[] = [
  "Esta exportação representa os dados disponíveis no Amém Chat no momento em que foi gerada.",
  "Alguns registros técnicos e de segurança (tokens, hashes, payloads de webhook, prompts internos e logs) não são incluídos.",
  "Informações de pagamento completas (cartão, método de pagamento e detalhes financeiros sensíveis) permanecem no provedor de pagamentos (Stripe) e não fazem parte deste arquivo.",
  "Baixar seus dados não exclui a conta nem apaga conversas. Para exclusão, use o suporte quando disponível.",
];
