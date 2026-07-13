import { describe, expect, it, afterEach } from "vitest";
import {
  persistLegalConsent,
  setLegalConsentRepositoryForTests,
  LegalConsentError,
  type LegalConsentRecord,
  type LegalConsentRepository,
} from "@/lib/legal/consent";
import {
  completeIntentAfterConfirmation,
  setSignupIntentRepositoryForTests,
  hashSignupIntentToken,
  signupIntentExpiresAt,
} from "@/lib/signup-intents";
import type {
  CreateSignupIntentInput,
  SignupIntentRecord,
  SignupIntentRepository,
} from "@/lib/signup-intents/types";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { safeSignUpMessage } from "@/lib/auth/sign-up-errors";

class MemoryLegalConsentRepository implements LegalConsentRepository {
  rows: LegalConsentRecord[] = [];
  failUpsert = false;

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
    if (this.failUpsert) throw new LegalConsentError("forced_fail");
    const existing = await this.find(
      input.userId,
      input.termsVersion,
      input.privacyVersion,
    );
    if (!existing) this.rows.push(input);
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
      stripeCheckoutSessionId: null,
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
}

describe("persistLegalConsent", () => {
  const consents = new MemoryLegalConsentRepository();

  afterEach(() => {
    consents.rows = [];
    consents.failUpsert = false;
    setLegalConsentRepositoryForTests(null);
  });

  it("creates consent", async () => {
    setLegalConsentRepositoryForTests(consents);
    const result = await persistLegalConsent({
      userId: "user-1",
      termsVersion: "v1",
      privacyVersion: "v1",
      acceptedAt: "2026-07-13T00:00:00.000Z",
      source: "test",
      requestId: "req-1",
    });
    expect(result).toBe("created");
    expect(consents.rows).toHaveLength(1);
  });

  it("is idempotent on repeated callback", async () => {
    setLegalConsentRepositoryForTests(consents);
    const input = {
      userId: "user-1",
      termsVersion: "v1",
      privacyVersion: "v1",
      acceptedAt: "2026-07-13T00:00:00.000Z",
      source: "test",
      requestId: "req-1",
    };
    expect(await persistLegalConsent(input)).toBe("created");
    expect(await persistLegalConsent(input)).toBe("already_exists");
    expect(consents.rows).toHaveLength(1);
  });

  it("fails when versions are missing", async () => {
    setLegalConsentRepositoryForTests(consents);
    await expect(
      persistLegalConsent({
        userId: "user-1",
        termsVersion: null,
        privacyVersion: "v1",
        acceptedAt: "2026-07-13T00:00:00.000Z",
        source: "test",
      }),
    ).rejects.toBeInstanceOf(LegalConsentError);
  });

  it("propagates persist failure", async () => {
    consents.failUpsert = true;
    setLegalConsentRepositoryForTests(consents);
    await expect(
      persistLegalConsent({
        userId: "user-1",
        termsVersion: "v1",
        privacyVersion: "v1",
        acceptedAt: "2026-07-13T00:00:00.000Z",
        source: "test",
      }),
    ).rejects.toBeInstanceOf(LegalConsentError);
  });
});

describe("completeIntentAfterConfirmation legal consent", () => {
  const original = { ...process.env };
  let intents: MemorySignupIntentRepository;
  let consents: MemoryLegalConsentRepository;
  let token: string;

  afterEach(() => {
    process.env = { ...original };
    setSignupIntentRepositoryForTests(null);
    setLegalConsentRepositoryForTests(null);
  });

  async function seed(opts?: {
    userId?: string | null;
    termsVersion?: string | null;
    privacyVersion?: string | null;
    termsAcceptedAt?: string | null;
  }) {
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    intents = new MemorySignupIntentRepository();
    consents = new MemoryLegalConsentRepository();
    setSignupIntentRepositoryForTests(intents);
    setLegalConsentRepositoryForTests(consents);

    token = "opaque-token-abc";
    await intents.create({
      selectedPlanKey: "caminho",
      userId: opts?.userId ?? null,
      tokenHash: hashSignupIntentToken(token),
      expiresAt: signupIntentExpiresAt(),
      termsVersion: opts?.termsVersion === undefined ? "v1" : (opts.termsVersion as string),
      privacyVersion:
        opts?.privacyVersion === undefined ? "v1" : (opts.privacyVersion as string),
      termsAcceptedAt:
        opts?.termsAcceptedAt === undefined
          ? "2026-07-13T00:00:00.000Z"
          : (opts.termsAcceptedAt as string),
    });
  }

  it("persists consent after associating user", async () => {
    await seed();
    const result = await completeIntentAfterConfirmation(token, "user-a", "req");
    expect(result.ok).toBe(true);
    expect(consents.rows).toHaveLength(1);
    expect(consents.rows[0]?.userId).toBe("user-a");
  });

  it("does not duplicate consent on repeated callback", async () => {
    await seed();
    expect((await completeIntentAfterConfirmation(token, "user-a", "req1")).ok).toBe(
      true,
    );
    expect((await completeIntentAfterConfirmation(token, "user-a", "req2")).ok).toBe(
      true,
    );
    expect(consents.rows).toHaveLength(1);
  });

  it("rejects intent belonging to another user", async () => {
    await seed({ userId: "owner-a" });
    const result = await completeIntentAfterConfirmation(token, "owner-b", "req");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_user");
    expect(consents.rows).toHaveLength(0);
  });

  it("fails when legal versions are absent", async () => {
    await seed({ termsVersion: null, privacyVersion: null, termsAcceptedAt: null });
    // Memory create requires string - patch after create
    const row = await intents.findByTokenHash(hashSignupIntentToken(token));
    if (row) {
      await intents.update(row.id, {
        termsVersion: null as unknown as string,
        privacyVersion: null as unknown as string,
        termsAcceptedAt: null as unknown as string,
      });
    }
    const result = await completeIntentAfterConfirmation(token, "user-a", "req");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_consent_data");
  });

  it("fails the flow when consent persistence fails", async () => {
    await seed();
    consents.failUpsert = true;
    const result = await completeIntentAfterConfirmation(token, "user-a", "req");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("consent_failed");
  });
});

describe("signUpAction config gate (deterministic)", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("detects missing public supabase env without importing server action", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(hasSupabasePublicEnv()).toBe(false);
    expect(safeSignUpMessage("config_missing")).toContain("configuração");
  });
});
