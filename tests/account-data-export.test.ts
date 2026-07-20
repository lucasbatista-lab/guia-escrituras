import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildExportFilename,
  buildUserDataExport,
  serializeUserDataExport,
  setUserDataExportPaginationForTests,
  USER_DATA_EXPORT_PAGE_SIZE,
} from "@/lib/account/export-user-data";
import { USER_DATA_EXPORT_VERSION } from "@/lib/account/export-types";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import { resetMemoryRepositoriesForTests } from "@/lib/database/repositories/memory";
import {
  setLegalConsentRepositoryForTests,
  type LegalConsentRecord,
  type LegalConsentRepository,
} from "@/lib/legal/consent";
import {
  setSignupIntentRepositoryForTests,
} from "@/lib/signup-intents/repository";
import type {
  CreateSignupIntentInput,
  SignupIntentRecord,
  SignupIntentRepository,
} from "@/lib/signup-intents/types";
import { AppError } from "@/lib/safety";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getAuthUserContext: vi.fn(),
  };
});

vi.mock("@/lib/billing/subscription-lookup", () => ({
  loadUserSubscriptions: vi.fn(),
  getEffectiveSubscriptionForUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => null),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("admin_unavailable_in_tests");
  }),
}));

vi.mock("@/lib/database/repositories", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/database/repositories")
  >("@/lib/database/repositories");
  return {
    ...actual,
    getRepositories: vi.fn(),
  };
});

vi.mock("@/lib/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getAuthUserContext } from "@/lib/auth";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import { getRepositories } from "@/lib/database/repositories";
import { logger } from "@/lib/logging/logger";
import { GET, POST } from "@/app/api/account/export/route";

class MemoryLegalConsentRepository implements LegalConsentRepository {
  rows: LegalConsentRecord[] = [];
  async find(userId: string, termsVersion: string, privacyVersion: string) {
    return (
      this.rows.find(
        (r) =>
          r.userId === userId &&
          r.termsVersion === termsVersion &&
          r.privacyVersion === privacyVersion,
      ) ?? null
    );
  }
  async upsert(input: LegalConsentRecord) {
    if (!(await this.find(input.userId, input.termsVersion, input.privacyVersion))) {
      this.rows.push(input);
    }
  }
  async listByUserId(userId: string) {
    return this.rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => a.acceptedAt.localeCompare(b.acceptedAt));
  }
}

class MemorySignupIntentRepository implements SignupIntentRepository {
  private rows = new Map<string, SignupIntentRecord>();

  async create(
    input: CreateSignupIntentInput & { tokenHash: string; expiresAt: string },
  ) {
    const record: SignupIntentRecord = {
      id: crypto.randomUUID(),
      tokenHash: input.tokenHash,
      userId: input.userId ?? null,
      selectedPlanKey: input.selectedPlanKey,
      referralCode: input.tracking?.referralCode ?? null,
      utmSource: input.tracking?.utmSource ?? null,
      utmMedium: input.tracking?.utmMedium ?? null,
      utmCampaign: input.tracking?.utmCampaign ?? null,
      utmContent: input.tracking?.utmContent ?? null,
      utmTerm: input.tracking?.utmTerm ?? null,
      status: input.userId ? "ready_for_checkout" : "pending_signup",
      termsVersion: input.termsVersion,
      privacyVersion: input.privacyVersion,
      termsAcceptedAt: input.termsAcceptedAt,
      stripeCheckoutSessionId: "cs_test_secret_should_not_export",
      checkoutCreatedAt: null,
      completedAt: null,
      expiresAt: input.expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(record.id, record);
    return record;
  }

  async findByTokenHash(tokenHash: string) {
    return [...this.rows.values()].find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findActionableByUserId(userId: string) {
    return [...this.rows.values()].filter((r) => r.userId === userId);
  }
  async findCheckoutCreatedByUserId(userId: string) {
    return [...this.rows.values()].filter((r) => r.userId === userId);
  }
  async listByUserId(userId: string) {
    return [...this.rows.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async update(
    id: string,
    patch: Partial<
      Pick<
        SignupIntentRecord,
        | "userId"
        | "status"
        | "termsVersion"
        | "privacyVersion"
        | "termsAcceptedAt"
      >
    >,
  ) {
    const current = this.rows.get(id);
    if (!current) throw new Error("not_found");
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.rows.set(id, updated);
    return updated;
  }

  seed(record: SignupIntentRecord) {
    this.rows.set(record.id, record);
  }
}

const authUser = {
  userId: "user-owner",
  email: "owner@example.com",
  spiritualProfile: {
    traditionKey: "ecumenical" as const,
    denomination: null,
    preferredBibleTranslation: null,
    responseStyle: "reflective" as const,
    preferredDepth: "balanced" as const,
    saintsContentEnabled: false,
    onboardingCompleted: true,
  },
  planKey: "caminho" as const,
  subscriptionStatus: "active",
  subscriptionPeriodEnd: "2026-08-01T00:00:00.000Z",
  hasStripeSubscription: true,
  hasDuplicateSubscriptions: false,
  isAdmin: false,
  demoMode: false,
};

describe("owner data portability", () => {
  let repos = createMemoryRepositories();
  let consents = new MemoryLegalConsentRepository();
  let intents = new MemorySignupIntentRepository();

  beforeEach(() => {
    resetMemoryRepositoriesForTests();
    repos = createMemoryRepositories();
    consents = new MemoryLegalConsentRepository();
    intents = new MemorySignupIntentRepository();
    setLegalConsentRepositoryForTests(consents);
    setSignupIntentRepositoryForTests(intents);
    setUserDataExportPaginationForTests(null);
    vi.mocked(getRepositories).mockReturnValue(repos);
    vi.mocked(loadUserSubscriptions).mockResolvedValue([]);
    vi.mocked(getAuthUserContext).mockResolvedValue(authUser as never);
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.warn).mockClear();
  });

  afterEach(() => {
    setLegalConsentRepositoryForTests(null);
    setSignupIntentRepositoryForTests(null);
    setUserDataExportPaginationForTests(null);
    vi.resetAllMocks();
  });

  async function seedOwnerData() {
    await repos.spiritualProfiles.upsert({
      userId: "user-owner",
      traditionKey: "catholic",
      denomination: "romana",
      preferredBibleTranslation: "NVI",
      responseStyle: "pastoral",
      preferredDepth: "deep",
      saintsContentEnabled: true,
      onboardingCompleted: true,
    });

    consents.rows.push({
      userId: "user-owner",
      termsVersion: "2026-07-12",
      privacyVersion: "2026-07-12",
      acceptedAt: "2026-07-12T12:00:00.000Z",
      source: "signup",
      createdAt: "2026-07-12T12:00:00.000Z",
    });

    intents.seed({
      id: "intent-1",
      tokenHash: "secret-token-hash-never-export",
      userId: "user-owner",
      selectedPlanKey: "caminho",
      referralCode: "AMIGO1",
      utmSource: "youtube",
      utmMedium: "video",
      utmCampaign: "launch",
      utmContent: "desc",
      utmTerm: "fe",
      status: "completed",
      termsVersion: "2026-07-12",
      privacyVersion: "2026-07-12",
      termsAcceptedAt: "2026-07-12T12:00:00.000Z",
      stripeCheckoutSessionId: "cs_test_secret",
      checkoutCreatedAt: "2026-07-12T12:05:00.000Z",
      completedAt: "2026-07-12T12:10:00.000Z",
      expiresAt: "2026-08-01T00:00:00.000Z",
      createdAt: "2026-07-12T11:00:00.000Z",
      updatedAt: "2026-07-12T12:10:00.000Z",
    });

    vi.mocked(loadUserSubscriptions).mockResolvedValue([
      {
        id: "sub-local-1",
        userId: "user-owner",
        planKey: "caminho",
        status: "active",
        stripeCustomerId: "cus_ABCDEFGHIJKLMN",
        stripeSubscriptionId: "sub_ABCDEFGHIJKLMN",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-12T12:10:00.000Z",
      },
    ]);

    const conversation = await repos.conversations.create({
      userId: "user-owner",
      personaKey: "guide",
      title: "Primeira conversa",
    });
    await repos.messages.insertUserMessage({
      conversationId: conversation.id,
      userId: "user-owner",
      content: "Olá",
      requestId: "req-1",
    });
    await repos.messages.insertAssistantMessage({
      conversationId: conversation.id,
      userId: "user-owner",
      content: "A paz do Senhor.",
      biblicalReferences: [
        { book: "João", chapter: 14, verseStart: 27 },
      ],
      requestId: "req-1",
    });

    await repos.usage.insertEvent({
      userId: "user-owner",
      requestId: "req-1",
      featureType: "chat_standard",
      model: "gpt-test",
      inputTokens: 10,
      outputTokens: 20,
      estimatedCostUsdMicros: 100,
      estimatedCostBrlCents: 5,
      latencyMs: 100,
      success: true,
    });
    await repos.usage.insertEvent({
      userId: "user-owner",
      requestId: "req-2",
      featureType: "chat_deep",
      model: "gpt-test",
      inputTokens: 10,
      outputTokens: 20,
      estimatedCostUsdMicros: 200,
      estimatedCostBrlCents: 12,
      latencyMs: 200,
      success: true,
    });
    await repos.usage.incrementMonthly({
      userId: "user-owner",
      yearMonth: "2026-07",
      addBrlCents: 5,
    });

    return conversation;
  }

  describe("authorization (API)", () => {
    it("returns 401 JSON for anonymous users", async () => {
      vi.mocked(getAuthUserContext).mockResolvedValue(null);
      const res = await GET(
        new Request("http://localhost/api/account/export?userId=other"),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("unauthenticated");
      expect(JSON.stringify(body)).not.toMatch(/stack|SELECT |password/i);
    });

    it("exports for authenticated user and ignores client userId", async () => {
      await seedOwnerData();
      const res = await GET(
        new Request(
          "http://localhost/api/account/export?userId=user-other&email=x@y.z",
          { headers: { "x-user-id": "user-other" } },
        ),
      );
      expect(res.status).toBe(200);
      const text = await res.text();
      const doc = JSON.parse(text);
      expect(doc.account.id).toBe("user-owner");
      expect(text).not.toContain("user-other");
      expect(text).not.toContain("secret-token-hash");
    });

    it("does not give admins special export privileges", async () => {
      await seedOwnerData();
      vi.mocked(getAuthUserContext).mockResolvedValue({
        ...authUser,
        isAdmin: true,
      } as never);
      const res = await GET(new Request("http://localhost/api/account/export"));
      expect(res.status).toBe(200);
      const doc = JSON.parse(await res.text());
      expect(doc.account.id).toBe("user-owner");
      expect(doc.account.id).not.toBe("admin-all-users");
    });

    it("rejects non-GET methods safely", async () => {
      const res = await POST();
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("GET");
      const body = await res.json();
      expect(body.code).toBe("method_not_allowed");
    });
  });

  describe("HTTP headers and format", () => {
    it("returns attachment JSON with private cache headers", async () => {
      await seedOwnerData();
      const res = await GET(new Request("http://localhost/api/account/export"));
      expect(res.headers.get("Content-Type")).toBe(
        "application/json; charset=utf-8",
      );
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      expect(disposition).toMatch(/^attachment; filename="/);
      expect(disposition).toContain(buildExportFilename());
      expect(disposition).not.toMatch(/@|owner@example/);
      const doc = JSON.parse(await res.text());
      expect(doc.exportVersion).toBe(USER_DATA_EXPORT_VERSION);
      expect(doc.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("content", () => {
    it("includes profile, spiritual, consents, acquisition, subscription, conversations, usage", async () => {
      await seedOwnerData();
      const { document } = await buildUserDataExport({
        userId: "user-owner",
        email: "owner@example.com",
        repos,
        now: new Date("2026-07-19T15:00:00.000Z"),
      });

      expect(document.account.email).toBe("owner@example.com");
      expect(document.spiritualProfile?.traditionKey).toBe("catholic");
      expect(document.spiritualProfile?.preferredDepth).toBe("deep");
      expect(document.legalConsents).toHaveLength(1);
      expect(document.acquisition.utmSource).toBe("youtube");
      expect(document.acquisition.referralCode).toBe("AMIGO1");
      expect(document.acquisition.signupIntent?.status).toBe("completed");
      expect(document.subscription?.planKey).toBe("caminho");
      expect(document.subscription?.cancelAtPeriodEnd).toBeNull();
      expect(document.subscription?.currency).toBe("BRL");
      expect(document.subscription?.periodicity).toBe("monthly");
      expect(document.conversations).toHaveLength(1);
      expect(document.conversations[0]!.messages).toHaveLength(2);
      expect(document.conversations[0]!.messages[0]!.role).toBe("user");
      expect(document.conversations[0]!.messages[1]!.biblicalReferences[0]).toEqual(
        expect.objectContaining({ book: "João", chapter: 14, verseStart: 27 }),
      );
      expect(document.usageSummary.standardRequests).toBe(1);
      expect(document.usageSummary.deepRequests).toBe(1);
      expect(document.usageSummary.monthly[0]?.yearMonth).toBe("2026-07");
      expect(document.notes.length).toBeGreaterThan(0);
    });

    it("handles account without conversations or subscription", async () => {
      const { document } = await buildUserDataExport({
        userId: "user-owner",
        email: null,
        repos,
      });
      expect(document.conversations).toEqual([]);
      expect(document.subscription).toBeNull();
      expect(document.spiritualProfile).toBeNull();
      expect(document.legalConsents).toEqual([]);
      expect(document.account.email).toBeNull();
    });

    it("orders messages chronologically and keeps deterministic conversation order", async () => {
      const older = await repos.conversations.create({
        userId: "user-owner",
        personaKey: "guide",
        title: "B",
      });
      await new Promise((r) => setTimeout(r, 5));
      const newer = await repos.conversations.create({
        userId: "user-owner",
        personaKey: "guide",
        title: "A",
      });
      await repos.messages.insertUserMessage({
        conversationId: older.id,
        userId: "user-owner",
        content: "first",
        requestId: "m1",
      });
      await new Promise((r) => setTimeout(r, 5));
      await repos.messages.insertUserMessage({
        conversationId: older.id,
        userId: "user-owner",
        content: "second",
        requestId: "m2",
      });
      await repos.messages.insertUserMessage({
        conversationId: newer.id,
        userId: "user-owner",
        content: "alone",
        requestId: "m3",
      });

      const { document } = await buildUserDataExport({
        userId: "user-owner",
        email: "owner@example.com",
        repos,
      });
      const msgs = document.conversations.find((c) => c.id === older.id)!.messages;
      expect(msgs.map((m) => m.content)).toEqual(["first", "second"]);
      expect(document.conversations.map((c) => c.id)).toEqual(
        [older.id, newer.id].sort((a, b) => {
          const ca = document.conversations.find((c) => c.id === a)!;
          const cb = document.conversations.find((c) => c.id === b)!;
          const byCreated = ca.createdAt.localeCompare(cb.createdAt);
          return byCreated !== 0 ? byCreated : a.localeCompare(b);
        }),
      );
    });
  });

  describe("security", () => {
    it("never exports secrets, webhook payloads, cards, or system prompts", async () => {
      await seedOwnerData();
      const other = await repos.conversations.create({
        userId: "user-other",
        personaKey: "guide",
        title: "Segredo de outro",
      });
      await repos.messages.insertUserMessage({
        conversationId: other.id,
        userId: "user-other",
        content: "mensagem de outro usuário",
        requestId: "other-1",
      });

      const { document } = await buildUserDataExport({
        userId: "user-owner",
        email: "owner@example.com",
        repos,
      });
      const json = serializeUserDataExport(document);

      expect(json).not.toContain("secret-token-hash");
      expect(json).not.toContain("cs_test_secret");
      expect(json).not.toContain("tokenHash");
      expect(json).not.toContain("stripeCheckoutSessionId");
      expect(json).not.toContain("sk_live");
      expect(json).not.toContain("sk_test");
      expect(json).not.toContain("4242");
      expect(json).not.toContain("payment_method");
      expect(json).not.toContain("system prompt");
      expect(json).not.toContain("mensagem de outro usuário");
      expect(json).not.toContain("Segredo de outro");
      expect(json).not.toMatch(/cus_ABCDEFGHIJKLMN[^…]|sub_ABCDEFGHIJKLMN[^…]/);
      expect(document.subscription?.providerCustomerIdMasked).toMatch(/…$/);
      expect(document.acquisition.signupIntent).not.toHaveProperty("tokenHash");
      expect(document.notes.some((n) => n.includes("webhook"))).toBe(true);
    });

    it("logs outcome without export content", async () => {
      await seedOwnerData();
      await GET(new Request("http://localhost/api/account/export"));
      const payload = vi.mocked(logger.info).mock.calls.find(
        (call) => call[0] === "user_data_export_requested",
      )?.[1] as Record<string, unknown>;
      expect(payload.outcome).toBe("success");
      expect(payload.userId).toBe("usr_user-own");
      expect(JSON.stringify(payload)).not.toContain("Olá");
      expect(JSON.stringify(payload)).not.toContain("A paz do Senhor");
    });

    it("returns safe errors without stack", async () => {
      vi.mocked(loadUserSubscriptions).mockRejectedValue(
        new Error("SELECT * FROM secrets boom stack"),
      );
      const res = await GET(new Request("http://localhost/api/account/export"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).not.toMatch(/SELECT|stack|boom/i);
      expect(body).not.toHaveProperty("stack");
    });
  });

  describe("volume / pagination", () => {
    it("assembles multiple pages without silent truncation", async () => {
      setUserDataExportPaginationForTests({ pageSize: 2, maxPages: 10 });
      for (let i = 0; i < 5; i += 1) {
        await repos.conversations.create({
          userId: "user-owner",
          personaKey: "guide",
          title: `C${i}`,
        });
      }
      const { document } = await buildUserDataExport({
        userId: "user-owner",
        email: "owner@example.com",
        repos,
      });
      expect(document.conversations).toHaveLength(5);
      expect(USER_DATA_EXPORT_PAGE_SIZE).toBe(500);
    });

    it("fails explicitly when max pages would truncate", async () => {
      setUserDataExportPaginationForTests({ pageSize: 2, maxPages: 1 });
      for (let i = 0; i < 3; i += 1) {
        await repos.conversations.create({
          userId: "user-owner",
          personaKey: "guide",
          title: `C${i}`,
        });
      }
      await expect(
        buildUserDataExport({
          userId: "user-owner",
          email: "owner@example.com",
          repos,
        }),
      ).rejects.toBeInstanceOf(AppError);

      try {
        await buildUserDataExport({
          userId: "user-owner",
          email: "owner@example.com",
          repos,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe("export_too_large");
        expect((error as AppError).status).toBe(413);
      }
    });

    it("does not mark partial success when repository fails mid-export", async () => {
      await seedOwnerData();
      vi.spyOn(repos.messages, "listPageForExport").mockRejectedValue(
        new AppError("db_error", "db_error", 500, "Erro ao exportar mensagens."),
      );
      await expect(
        buildUserDataExport({
          userId: "user-owner",
          email: "owner@example.com",
          repos,
        }),
      ).rejects.toMatchObject({ code: "db_error" });
    });
  });

  describe("UI / docs / privacy structural", () => {
    it("conta page includes data export section and keeps cancellation panel", () => {
      const conta = readFileSync(
        join(process.cwd(), "src/app/(platform)/conta/page.tsx"),
        "utf8",
      );
      expect(conta).toContain("Seus dados");
      expect(conta).toContain("DataExportPanel");
      expect(conta).toContain("SubscriptionManagementPanel");
      expect(conta).toContain("cancelAtPeriodEnd");
    });

    it("data export panel meets a11y/download requirements", () => {
      const panel = readFileSync(
        join(process.cwd(), "src/components/account/data-export-panel.tsx"),
        "utf8",
      );
      expect(panel).toContain("Baixar meus dados");
      expect(panel).toContain("min-h-11");
      expect(panel).toContain("aria-busy");
      expect(panel).toContain("aria-live");
      expect(panel).toContain("URL.revokeObjectURL");
      expect(panel).toContain("createObjectURL");
      expect(panel).not.toContain("dangerouslySetInnerHTML");
      expect(panel).not.toContain("localStorage");
      expect(panel).toContain("401");
      expect(panel).toContain("429");
    });

    it("privacy policy mentions self-service download without promising deletion", () => {
      const privacy = readFileSync(
        join(process.cwd(), "src/app/(marketing)/privacidade/page.tsx"),
        "utf8",
      );
      expect(privacy).toContain("/conta");
      expect(privacy).toContain("Stripe");
      expect(privacy).toContain("não equivale à exclusão");
      expect(privacy).not.toContain("exclusão automática");
    });

    it("documents portability", () => {
      const doc = readFileSync(
        join(process.cwd(), "docs/USER_DATA_PORTABILITY.md"),
        "utf8",
      );
      expect(doc).toContain("/api/account/export");
      expect(doc).toContain("amem-chat-user-data-v1");
      expect(doc).toContain("export_too_large");
    });
  });
});
