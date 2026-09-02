import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("launch auth closure — access gaps", () => {
  it("uses compact consent on auth surfaces so login submit is not blocked", () => {
    const banner = read("src", "components", "consent", "consent-banner.tsx");
    expect(banner).toContain('pathname === "/entrar"');
    expect(banner).toContain('pathname === "/cadastro"');
    expect(banner).toContain("authCompact");
  });

  it("reserves bottom safe area on auth shell for consent banner", () => {
    const shell = read("src", "components", "auth", "auth-shell.tsx");
    expect(shell).toContain("pb-[max(5.5rem,var(--safe-bottom))]");
  });

  it("preserves checkout intent when assinar/continuar requires login", () => {
    const page = read("src", "app", "(platform)", "assinar", "continuar", "page.tsx");
    expect(page).toContain("encodeURIComponent(intentToken)");
    expect(page).toContain("/assinar/continuar?intent=");
    expect(page).not.toContain('redirect("/entrar?next=/assinar/continuar")');
  });

  it("passes intent through confira-seu-email resend", () => {
    const page = read("src", "app", "(auth)", "confira-seu-email", "page.tsx");
    const experience = read(
      "src",
      "components",
      "auth",
      "check-email-experience.tsx",
    );
    const action = read("src", "lib", "auth", "sign-up-action.ts");
    expect(page).toContain("intentToken");
    expect(experience).toContain("intentToken");
    expect(experience).toContain("resendConfirmationAction");
    expect(action).toContain("if (intentToken) params.set(\"intent\", intentToken)");
  });
});
