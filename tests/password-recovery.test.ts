import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getPasswordRecoveryRedirectTo,
  maskEmail,
} from "@/lib/auth";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const originalEnv = snapshotEnv();

beforeEach(() => {
  restoreEnv(originalEnv);
  process.env.APP_URL = "https://amemchat.com.br";
  process.env.NEXT_PUBLIC_APP_URL = "https://amemchat.com.br";
});

afterEach(() => {
  restoreEnv(originalEnv);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("password recovery redirect (token_hash SSR)", () => {
  it("points to /auth/confirm with next=/redefinir-senha", () => {
    expect(getPasswordRecoveryRedirectTo()).toBe(
      "https://amemchat.com.br/auth/confirm?next=%2Fredefinir-senha",
    );
    expect(getPasswordRecoveryRedirectTo()).not.toContain("/auth/callback");
    expect(getPasswordRecoveryRedirectTo()).not.toContain("@");
  });
});

describe("password recovery source contracts", () => {
  it("confirm route forces recovery to /redefinir-senha and uses verifyOtp", () => {
    const confirm = read("src", "app", "auth", "confirm", "route.ts");
    expect(confirm).toContain('type === "recovery"');
    expect(confirm).toContain("/redefinir-senha");
    expect(confirm).toContain("verifyOtp");
    expect(confirm).toContain("token_hash");
    expect(confirm).toContain("/recuperar-senha");
    expect(confirm).not.toContain("exchangeCodeForSession");
  });

  it("supports same-browser and cross-browser recovery path", () => {
    const resetAction = read("src", "lib", "auth", "password-reset-action.ts");
    expect(resetAction).toContain("getPasswordRecoveryRedirectTo");
    expect(resetAction).toContain("resetPasswordForEmail");
    expect(resetAction).toContain('mode: "recovery"');
    expect(resetAction).toContain("maskEmail");
    expect(resetAction).not.toContain("window.location");

    const updateAction = read("src", "lib", "auth", "update-password-action.ts");
    expect(updateAction).toContain("updateUser");
    expect(updateAction).toContain("password");
    expect(updateAction).toContain("no_session");

    const page = read("src", "app", "(auth)", "redefinir-senha", "page.tsx");
    expect(page).toContain("Senha atualizada");
    expect(page).toContain("Entrar no Amém Chat");
    expect(page).toContain("UpdatePasswordForm");
  });

  it("expired/invalid tokens redirect to recovery errors without jargon", () => {
    const forgot = read("src", "components", "auth", "forgot-password-form.tsx");
    expect(forgot).toContain("RECOVERY_ERRORS");
    expect(forgot).toContain("Este link expirou");
    expect(forgot).toContain("Solicite um novo");
    expect(forgot).not.toContain("token_hash");
    expect(forgot).not.toContain("PKCE");
    expect(forgot).not.toContain("verifyOtp");

    const confirm = read("src", "app", "auth", "confirm", "route.ts");
    expect(confirm).toContain('expired ? "expired" : "token"');
  });

  it("proxy keeps recovery session and does not bounce redefine page", () => {
    const proxy = read("src", "lib", "supabase", "proxy.ts");
    expect(proxy).toContain("RECOVERY_SESSION_PAGES");
    expect(proxy).toContain("/redefinir-senha");
    expect(proxy).toContain("AUTH_BOUNCE_PAGES");
    expect(proxy).toContain('"/entrar"');
    expect(proxy).toContain('"/cadastro"');
    // Signed-in users must not be forced away from password reset entry.
    expect(proxy).not.toMatch(
      /AUTH_BOUNCE_PAGES\s*=\s*\[[^\]]*recuperar-senha/,
    );
  });

  it("check-email recovery mode has resend cooldown and generic copy", () => {
    const ux = read("src", "components", "auth", "check-email-experience.tsx");
    expect(ux).toContain('mode === "recovery"');
    expect(ux).toContain("requestPasswordResetAction");
    expect(ux).toContain("RESEND_COOLDOWN_SECONDS");
    expect(ux).toContain("Reenviar link de recuperação");
    expect(ux).toContain("Corrigir e-mail");
    expect(ux).not.toMatch(/token_hash|OTP|PKCE/i);

    const page = read(
      "src",
      "app",
      "(auth)",
      "confira-seu-email",
      "page.tsx",
    );
    expect(page).toContain('modeParam === "recovery"');
    expect(page).toContain("supportEmail");
  });

  it("resend confirmation keeps intent + generic enumeration-safe message", () => {
    const resend = read("src", "lib", "auth", "resend-confirmation-action.ts");
    expect(resend).toContain("getEmailRedirectToWithIntent");
    expect(resend).toContain("readSignupIntentCookie");
    expect(resend).toContain(
      "Se este e-mail estiver pendente de confirmação, enviamos um novo link.",
    );
    expect(resend).toContain("maskEmail");
    expect(resend).not.toContain("não cadastrado");
  });

  it("account email change is hidden / unavailable (P1)", () => {
    const conta = read("src", "app", "(platform)", "conta", "page.tsx");
    expect(conta).toContain("ainda não está disponível");
    expect(conta).not.toContain("updateUser({ email");
    expect(conta).not.toContain("Alterar e-mail");
    expect(conta).toContain("Redefinir senha");
  });

  it("magic link has no public login CTA; confirm route remains ready", () => {
    const login = read("src", "components", "auth", "login-form.tsx");
    expect(login).not.toMatch(/magic|link mágico|sem senha/i);
    expect(login).toContain("Esqueci minha senha");

    const confirm = read("src", "app", "auth", "confirm", "route.ts");
    expect(confirm).toContain('"magiclink"');
  });

  it("support email comes from configured env only", () => {
    const example = read(".env.example");
    expect(example).toContain("NEXT_PUBLIC_SUPPORT_EMAIL=amemchatbr@gmail.com");
    const forgot = read("src", "components", "auth", "forgot-password-form.tsx");
    expect(forgot).toContain("supportEmail");
    expect(forgot).not.toContain("amemchatbr@gmail.com");
  });

  it("docs distinguish token_hash recovery vs ConfirmationURL", () => {
    const templates = read("docs", "AUTH_EMAIL_TEMPLATES.md");
    expect(templates).toContain(
      "{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery",
    );
    expect(templates).toContain(
      "{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email",
    );
    expect(templates).toContain("type=magiclink");
    expect(templates).toContain("P1");
    expect(templates).toContain("ConfirmationURL");

    const setup = read("docs", "AUTH_EMAIL_SETUP.md");
    expect(setup).toContain("type=recovery");
    expect(setup).toContain("/redefinir-senha");
  });

  it("logs stay sanitized (no full email helpers in recovery actions)", () => {
    const resetAction = read("src", "lib", "auth", "password-reset-action.ts");
    expect(resetAction).toContain("emailMasked: maskEmail");
    expect(resetAction).not.toContain("email: parsed.data.email");
    expect(maskEmail("cliente@amemchat.com.br")).toBe("c***@amemchat.com.br");
    expect(maskEmail("cliente@amemchat.com.br")).not.toContain("cliente@");
  });

  it("does not hit the network in these contracts", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    getPasswordRecoveryRedirectTo();
    maskEmail("a@b.co");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("update password action (unit, mocked)", () => {
  it("rejects weak password and mismatch without calling network when schema fails", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/keys", () => ({
      hasSupabasePublicEnv: () => true,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => {
        throw new Error("should not create client for schema failure");
      }),
    }));

    const { updatePasswordAction } = await import(
      "@/lib/auth/update-password-action"
    );

    const weak = await updatePasswordAction({
      password: "short",
      confirmPassword: "short",
    });
    expect(weak.ok).toBe(false);
    if (!weak.ok) expect(weak.code).toBe("password_weak");

    const mismatch = await updatePasswordAction({
      password: "SenhaForte1",
      confirmPassword: "SenhaForte2",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.code).toBe("password_mismatch");
  });

  it("requires session before updating password", async () => {
    vi.resetModules();
    const updateUser = vi.fn();
    vi.doMock("@/lib/supabase/keys", () => ({
      hasSupabasePublicEnv: () => true,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null } }),
          updateUser,
        },
      })),
    }));

    const { updatePasswordAction } = await import(
      "@/lib/auth/update-password-action"
    );
    const result = await updatePasswordAction({
      password: "SenhaForte1",
      confirmPassword: "SenhaForte1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("no_session");
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe("request password reset action (unit, mocked)", () => {
  it("returns enumeration-safe success and masked hint", async () => {
    vi.resetModules();
    const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
    vi.doMock("@/lib/supabase/keys", () => ({
      hasSupabasePublicEnv: () => true,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: { resetPasswordForEmail },
      })),
    }));

    const { requestPasswordResetAction } = await import(
      "@/lib/auth/password-reset-action"
    );
    const result = await requestPasswordResetAction({
      email: "pessoa@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toMatch(/Se o e-mail existir/i);
      expect(result.emailHint).toBe("p***@example.com");
      expect(result.redirectTo).toContain("mode=recovery");
      expect(result.redirectTo).not.toContain("pessoa@");
    }
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "pessoa@example.com",
      expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/confirm?next="),
      }),
    );
  });

  it("soft-oks unknown errors without enumerating", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/keys", () => ({
      hasSupabasePublicEnv: () => true,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          resetPasswordForEmail: async () => ({
            error: { message: "User not found", code: "user_not_found" },
          }),
        },
      })),
    }));

    const { requestPasswordResetAction } = await import(
      "@/lib/auth/password-reset-action"
    );
    const result = await requestPasswordResetAction({
      email: "ghost@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toMatch(/Se o e-mail existir/i);
    }
  });
});
