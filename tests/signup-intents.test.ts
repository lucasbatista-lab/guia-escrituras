import { describe, expect, it, afterEach, vi } from "vitest";
import {
  buildCadastroHref,
  hashSignupIntentToken,
  isSignupIntentExpired,
  parseSignupSearchParams,
  signupIntentExpiresAt,
  validateCheckoutPlan,
} from "@/lib/signup-intents";
import {
  assertNotSelfReferral,
  assertNoDuplicateAttribution,
} from "@/lib/referrals";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";
import type {
  CreateSignupIntentInput,
  SignupIntentRecord,
  SignupIntentRepository,
} from "@/lib/signup-intents/types";
import { setSignupIntentRepositoryForTests } from "@/lib/signup-intents/repository";
import {
  setLegalConsentRepositoryForTests,
  type LegalConsentRecord,
  type LegalConsentRepository,
} from "@/lib/legal/consent";

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
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(id, updated);
    return updated;
  }
}

describe("validateCheckoutPlan", () => {
  it("accepts checkout plans", () => {
    expect(validateCheckoutPlan("caminho").ok).toBe(true);
    expect(validateCheckoutPlan("essencial").ok).toBe(true);
    expect(validateCheckoutPlan("profundo").ok).toBe(true);
  });

  it("rejects particular (request access)", () => {
    const result = validateCheckoutPlan("particular");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("request_access_plan");
  });

  it("rejects invalid and free-like keys", () => {
    expect(validateCheckoutPlan("free").ok).toBe(false);
    expect(validateCheckoutPlan("nope").ok).toBe(false);
  });
});

describe("parseSignupSearchParams", () => {
  it("preserves UTMs and referral with sanitization", () => {
    const long = "x".repeat(200);
    const parsed = parseSignupSearchParams({
      plan: "caminho",
      ref: " AMEM10 ",
      utm_source: long,
      utm_medium: "email",
      utm_campaign: "launch",
      junk: "ignored",
    });
    expect(parsed.planKey).toBe("caminho");
    expect(parsed.tracking.referralCode).toBe("AMEM10");
    expect(parsed.tracking.utmSource?.length).toBe(120);
    expect(parsed.tracking.utmMedium).toBe("email");
  });
});

describe("signup intent tokens", () => {
  it("hashes token without storing raw value", () => {
    const hash = hashSignupIntentToken("opaque-token-value");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("opaque");
  });

  it("expires after 48 hours", () => {
    const expires = signupIntentExpiresAt(new Date("2026-07-12T12:00:00Z"));
    expect(isSignupIntentExpired(expires, new Date("2026-07-14T13:00:00Z"))).toBe(
      true,
    );
    expect(isSignupIntentExpired(expires, new Date("2026-07-13T12:00:00Z"))).toBe(
      false,
    );
  });
});

describe("referral guards", () => {
  it("blocks self-referral", () => {
    expect(assertNotSelfReferral("u1", "u1").ok).toBe(false);
  });

  it("blocks duplicate attribution", () => {
    expect(
      assertNoDuplicateAttribution({
        referralCode: "X",
        referrerUserId: "a",
        referredUserId: "b",
        status: "attributed",
      }).ok,
    ).toBe(false);
  });
});

describe("buildCadastroHref", () => {
  it("builds plan signup URL without unknown params", () => {
    const href = buildCadastroHref("essencial", {
      referralCode: "REF",
      utmSource: "ig",
    });
    expect(href).toBe("/cadastro?plan=essencial&ref=REF&utm_source=ig");
  });
});

describe("signup intent service", () => {
  const original = { ...process.env };
  let memory: MemorySignupIntentRepository;

  afterEach(() => {
    process.env = { ...original };
    setSignupIntentRepositoryForTests(null);
    setLegalConsentRepositoryForTests(null);
    vi.clearAllMocks();
  });

  async function setup() {
    memory = new MemorySignupIntentRepository();
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.APP_URL = "https://amem-chat.vercel.app";

    setSignupIntentRepositoryForTests(memory);
    setLegalConsentRepositoryForTests(new MemoryLegalConsentRepository());

    return import("@/lib/signup-intents/service");
  }

  it("creates intent and callback URL with opaque token only", async () => {
    const svc = await setup();
    const { record, token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "caminho",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    expect(record.status).toBe("pending_signup");
    expect(svc.getAuthCallbackUrlForIntent(token)).toBe(
      `https://amem-chat.vercel.app/auth/callback?intent=${encodeURIComponent(token)}`,
    );
    expect(svc.getAuthCallbackUrlForIntent(token)).not.toContain("utm");
    expect(svc.getAuthCallbackUrlForIntent(token)).not.toContain("@");
  });

  it("associates intent to user after confirmation", async () => {
    const svc = await setup();
    const { record, token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "essencial",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(record.id, { status: "awaiting_confirmation" });
    const result = await svc.completeIntentAfterConfirmation(
      token,
      "user-123",
      "req-1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectTo).toContain("/assinar/continuar?intent=");
    }
    const updated = await memory.findById(record.id);
    expect(updated?.userId).toBe("user-123");
    expect(updated?.status).toBe("ready_for_checkout");
  });

  it("rejects intent belonging to another user", async () => {
    const svc = await setup();
    const { record, token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "profundo",
      userId: "owner-a",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(record.id, { status: "ready_for_checkout" });
    const result = await svc.completeIntentAfterConfirmation(
      token,
      "owner-b",
      "req-2",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_user");
  });
});

describe("no free plan in catalog", () => {
  it("does not expose a free plan", () => {
    expect(PLAN_DEFINITIONS.some((p) => p.key === "free")).toBe(false);
    expect(PLAN_DEFINITIONS.every((p) => p.priceMonthlyCents > 0)).toBe(true);
  });
});
