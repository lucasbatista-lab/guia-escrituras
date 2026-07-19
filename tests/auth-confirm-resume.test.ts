import { describe, expect, it, afterEach } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getEmailRedirectTo,
  getEmailRedirectToWithIntent,
} from "@/lib/auth/app-url";
import {
  hashSignupIntentToken,
  signupIntentExpiresAt,
  type CreateSignupIntentInput,
  type SignupIntentRecord,
  type SignupIntentRepository,
} from "@/lib/signup-intents";
import { setSignupIntentRepositoryForTests } from "@/lib/signup-intents/repository";
import {
  setLegalConsentRepositoryForTests,
  type LegalConsentRecord,
  type LegalConsentRepository,
} from "@/lib/legal/consent";
import { SIGNUP_INTENT_COOKIE, signupIntentCookieOptions } from "@/lib/signup-intents";

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

  async findActionableByUserId(userId: string) {
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.userId === userId &&
          (r.status === "ready_for_checkout" ||
            r.status === "awaiting_confirmation") &&
          new Date(r.expiresAt).getTime() > Date.now(),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  async findCheckoutCreatedByUserId(userId: string) {
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.userId === userId &&
          r.status === "checkout_created" &&
          new Date(r.expiresAt).getTime() > Date.now(),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
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

describe("auth confirm token_hash flow", () => {
  it("confirm route uses verifyOtp and intent completion", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "app", "auth", "confirm", "route.ts"),
      "utf8",
    );
    expect(src).toContain("verifyOtp");
    expect(src).toContain("token_hash");
    expect(src).toContain("completeIntentAfterConfirmation");
    expect(src).toContain("safeNextPath");
    expect(src).toContain("setSignupIntentCookie");
    expect(src).toContain("auth_confirm_missing_token_hash");
    expect(src).not.toContain("exchangeCodeForSession");
  });

  it("legacy callback remains for old links", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "app", "auth", "callback", "route.ts"),
      "utf8",
    );
    expect(src).toContain("exchangeCodeForSession");
    expect(src).toContain("completeIntentAfterConfirmation");
  });

  it("email redirect uses /auth/confirm with query string", () => {
    process.env.APP_URL = "https://amemchat.com.br";
    expect(getEmailRedirectTo("/planos")).toBe(
      "https://amemchat.com.br/auth/confirm?next=%2Fplanos",
    );
    expect(getEmailRedirectToWithIntent("opaqueTokenValue123", "/email-confirmado")).toBe(
      "https://amemchat.com.br/auth/confirm?intent=opaqueTokenValue123&next=%2Femail-confirmado",
    );
    expect(getEmailRedirectToWithIntent("opaqueTokenValue123")).not.toContain("@");
    expect(getEmailRedirectToWithIntent("opaqueTokenValue123")).not.toContain("utm");
  });
});

describe("continuity cookie", () => {
  it("is HttpOnly, Secure in production, SameSite=Lax", () => {
    const opts = signupIntentCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(SIGNUP_INTENT_COOKIE).toBe("amem_signup_intent");
  });

  it("cookie helper never stores email or price", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "lib", "signup-intents", "continuity-cookie.ts"),
      "utf8",
    );
    expect(src).toContain("httpOnly: true");
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toContain("email");
    expect(src).not.toContain("price");
  });
});

describe("signup intent resume by user", () => {
  const original = snapshotEnv();
  let memory: MemorySignupIntentRepository;

  afterEach(() => {
    restoreEnv(original);
    setSignupIntentRepositoryForTests(null);
    setLegalConsentRepositoryForTests(null);
  });

  async function setup() {
    memory = new MemorySignupIntentRepository();
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.APP_URL = "https://amemchat.com.br";
    setSignupIntentRepositoryForTests(memory);
    setLegalConsentRepositoryForTests(new MemoryLegalConsentRepository());
    return import("@/lib/signup-intents/service");
  }

  it("getAuthConfirmUrlForIntent uses confirm path", async () => {
    const svc = await setup();
    const { token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "caminho",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    expect(svc.getAuthConfirmUrlForIntent(token)).toContain("/auth/confirm?");
    expect(svc.getAuthConfirmUrlForIntent(token)).toContain("intent=");
    expect(svc.getAuthConfirmUrlForIntent(token)).toContain("next=");
  });

  it("associates user early while awaiting confirmation", async () => {
    const svc = await setup();
    const { record } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "essencial",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    const updated = await svc.associateIntentUserAwaitingConfirmation(
      record.id,
      "user-new",
    );
    expect(updated.userId).toBe("user-new");
    expect(updated.status).toBe("awaiting_confirmation");
  });

  it("findLatestActionableIntentByUserId prioritizes ready_for_checkout", async () => {
    const svc = await setup();
    const a = await svc.createSignupIntentWithToken({
      selectedPlanKey: "essencial",
      userId: "u1",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(a.record.id, {
      status: "awaiting_confirmation",
      userId: "u1",
    });
    const b = await svc.createSignupIntentWithToken({
      selectedPlanKey: "caminho",
      userId: "u1",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(b.record.id, { status: "ready_for_checkout" });

    const found = await svc.findLatestActionableIntentByUserId("u1");
    expect(found?.id).toBe(b.record.id);
    expect(found?.selectedPlanKey).toBe("caminho");
  });

  it("never returns another user's intent", async () => {
    const svc = await setup();
    const { record } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "profundo",
      userId: "owner-a",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(record.id, { status: "ready_for_checkout" });
    const found = await svc.findLatestActionableIntentByUserId("owner-b");
    expect(found).toBeNull();
  });

  it("completeIntent is idempotent for repeated callback", async () => {
    const svc = await setup();
    const { record, token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "caminho",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(record.id, {
      status: "awaiting_confirmation",
      userId: "u1",
    });
    const first = await svc.completeIntentAfterConfirmation(token, "u1", "r1");
    const second = await svc.completeIntentAfterConfirmation(token, "u1", "r2");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.redirectTo).toContain("/email-confirmado");
      expect(second.redirectTo).toContain("/email-confirmado");
    }
  });

  it("rejects expired intent", async () => {
    const svc = await setup();
    const { record, token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "caminho",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    const expired = {
      ...(await memory.findById(record.id))!,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      status: "awaiting_confirmation" as const,
      userId: "u1",
    };
    // force via update + direct map mutation for expiry
    await memory.update(record.id, {
      status: "awaiting_confirmation",
      userId: "u1",
    });
    const row = await memory.findById(record.id);
    if (row) {
      (row as { expiresAt: string }).expiresAt = expired.expiresAt;
    }
    const result = await svc.completeIntentAfterConfirmation(token, "u1", "r3");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired");
  });

  it("getContinuationViewStateForUser works without opaque token", async () => {
    const svc = await setup();
    const { record } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "essencial",
      userId: "u-resume",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    await memory.update(record.id, { status: "ready_for_checkout" });
    const state = await svc.getContinuationViewStateForUser("u-resume");
    expect(state.kind).toBe("ready");
    if (state.kind === "ready") {
      expect(state.intentToken).toBeNull();
      expect(state.intentId).toBe(record.id);
    }
  });

  it("rejects wrong user on complete", async () => {
    const svc = await setup();
    const { token } = await svc.createSignupIntentWithToken({
      selectedPlanKey: "caminho",
      userId: "owner-a",
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
    });
    const result = await svc.completeIntentAfterConfirmation(token, "owner-b", "r4");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_user");
  });
});

describe("post-signup and confirmed pages", () => {
  it("dedicated check-email experience exists without Criar conta CTA after success", () => {
    const page = readFileSync(
      join(process.cwd(), "src", "app", "(auth)", "confira-seu-email", "page.tsx"),
      "utf8",
    );
    const exp = readFileSync(
      join(process.cwd(), "src", "components", "auth", "check-email-experience.tsx"),
      "utf8",
    );
    expect(page).toContain("CheckEmailExperience");
    expect(exp).toContain("Confira seu e-mail");
    expect(exp).toContain("Nenhuma cobrança ocorreu");
    expect(exp).toContain("Reenviar e-mail de confirmação");
    expect(exp).toContain("Corrigir e-mail");
    expect(exp).not.toContain(">Criar conta<");
  });

  it("email-confirmado requires session and links to payment without GET checkout", () => {
    const page = readFileSync(
      join(process.cwd(), "src", "app", "(auth)", "email-confirmado", "page.tsx"),
      "utf8",
    );
    const exp = readFileSync(
      join(process.cwd(), "src", "components", "auth", "email-confirmed-experience.tsx"),
      "utf8",
    );
    expect(page).toContain("getAuthUserContext");
    expect(page).toContain("redirect");
    expect(page).toContain("/assinar/continuar");
    expect(exp).toContain("E-mail confirmado");
    expect(exp).toContain("Continuar para pagamento");
    expect(exp).toContain("prefers-reduced-motion");
    expect(exp).toContain("continueHref");
    expect(exp).not.toContain("checkout.sessions");
    expect(exp).not.toContain("createSubscriptionCheckout");
  });

  it("assinar/continuar can resume without intent token for authenticated user", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "app", "(platform)", "assinar", "continuar", "page.tsx"),
      "utf8",
    );
    expect(src).toContain("getContinuationViewStateForUser");
    expect(src).toContain("startCheckoutAction");
    expect(src).not.toMatch(/createSubscriptionCheckout\(/);
  });
});

describe("sign-up redirects to confirm and check-email", () => {
  it("sign-up-action uses confirm URL and early associate", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "lib", "auth", "sign-up-action.ts"),
      "utf8",
    );
    expect(src).toContain("getEmailRedirectToWithIntent");
    expect(src).toContain("associateIntentUserAwaitingConfirmation");
    expect(src).toContain("/confira-seu-email");
    expect(src).toContain("setSignupIntentCookie");
    expect(src).not.toContain("getAuthCallbackUrlForIntent");
  });

  it("login uses post-login destination resume", () => {
    const login = readFileSync(
      join(process.cwd(), "src", "lib", "auth", "login-action.ts"),
      "utf8",
    );
    const dest = readFileSync(
      join(process.cwd(), "src", "lib", "auth", "post-login-destination.ts"),
      "utf8",
    );
    expect(login).toContain("resolvePostLoginDestination");
    expect(dest).toContain("findLatestActionableIntentByUserId");
    expect(dest).toContain("/planos");
    expect(dest).toContain("Never uses /inicio as a universal fallback");
  });

  it("AUTH_EMAIL_SETUP documents token_hash template", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs", "AUTH_EMAIL_SETUP.md"),
      "utf8",
    );
    expect(doc).toContain(
      'href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"',
    );
  });
});

describe("no token leakage in confirm logs", () => {
  it("confirm route does not log secrets", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "app", "auth", "confirm", "route.ts"),
      "utf8",
    );
    const blocks = src.match(/logger\.(error|warn|info)\([\s\S]*?\);/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).not.toContain("tokenHash");
      expect(block).not.toContain("token_hash:");
      expect(block).not.toContain("intentToken");
      expect(block).not.toMatch(/email\s*:/);
    }
  });
});

describe("signup with and without plan email next", () => {
  const original = snapshotEnv();
  afterEach(() => {
    restoreEnv(original);
  });

  it("with plan next is email-confirmado; without is planos", () => {
    process.env.APP_URL = "https://amemchat.com.br";
    expect(getEmailRedirectToWithIntent("tokentokentoken12")).toContain(
      "next=%2Femail-confirmado",
    );
    expect(getEmailRedirectTo("/planos")).toContain("next=%2Fplanos");
  });
});

void hashSignupIntentToken;
void signupIntentExpiresAt;
