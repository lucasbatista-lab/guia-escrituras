import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";

describe("loginAction", () => {
  const original = snapshotEnv();

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/lib/supabase/keys");
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/lib/auth/post-login-destination");
    restoreEnv(original);
  });

  async function loadLogin(mocks: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    redirectTo?: string;
  }) {
    vi.doMock("@/lib/supabase/keys", async () => {
      const actual = await vi.importActual<typeof import("@/lib/supabase/keys")>(
        "@/lib/supabase/keys",
      );
      return { ...actual, hasSupabasePublicEnv: () => true };
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: { signInWithPassword: mocks.signInWithPassword },
      })),
    }));
    vi.doMock("@/lib/auth/post-login-destination", () => ({
      resolvePostLoginDestination: vi.fn(async () => mocks.redirectTo ?? "/planos"),
    }));
    return import("@/lib/auth/login-action");
  }

  it("returns redirect on success", async () => {
    const { loginAction } = await loadLogin({
      signInWithPassword: vi.fn(async () => ({ data: { user: {} }, error: null })),
      redirectTo: "/assinar/continuar",
    });
    const result = await loginAction({
      email: "ana@domain.com",
      password: "senhaforte1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.redirectTo).toBe("/assinar/continuar");
  });

  it("surfaces email_not_confirmed with guidance", async () => {
    const { loginAction } = await loadLogin({
      signInWithPassword: vi.fn(async () => ({
        data: { user: null },
        error: { code: "email_not_confirmed", message: "Email not confirmed" },
      })),
    });
    const result = await loginAction({
      email: "ana@domain.com",
      password: "senhaforte1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("email_not_confirmed");
      expect(result.message.toLowerCase()).toContain("confirme");
    }
  });

  it("never returns ok without redirect target", async () => {
    const { loginAction } = await loadLogin({
      signInWithPassword: vi.fn(async () => ({ data: { user: {} }, error: null })),
      redirectTo: "/inicio",
    });
    const result = await loginAction({
      email: "ana@domain.com",
      password: "wrong",
    });
    if (result.ok) {
      expect(result.redirectTo).toBeTruthy();
    } else {
      expect(result.message).toBeTruthy();
    }
  });
});

describe("login form guarantees", () => {
  it("uses hard navigation after success", () => {
    const form = readFileSync(
      join(process.cwd(), "src", "components", "auth", "login-form.tsx"),
      "utf8",
    );
    expect(form).toContain("window.location.assign");
    expect(form).toContain("submittingRef");
    expect(form).toContain("email_not_confirmed");
  });
});
