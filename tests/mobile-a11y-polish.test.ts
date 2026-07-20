import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAIN_CONTENT_ID } from "@/components/a11y/main-content-id";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("mobile accessibility & resilience polish", () => {
  it("defines safe-area and dvh utilities without visualViewport rewrite", () => {
    const css = read("src", "app", "globals.css");
    expect(css).toContain("--safe-top");
    expect(css).toContain("--safe-bottom");
    expect(css).toContain("safe-area-inset-top");
    expect(css).toContain("safe-composer-pad");
    expect(css).toContain("safe-header-pad");
    expect(css).toContain("chat-shell-min-h");
    expect(css).toContain("100dvh");
    expect(css).toContain("min-height: 100vh");
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("skip-to-content");
    expect(css).not.toContain("visualViewport");
  });

  it("root layout exports viewport-fit cover and skip link", () => {
    const layout = read("src", "app", "layout.tsx");
    expect(layout).toContain("viewportFit");
    expect(layout).toContain("cover");
    expect(layout).toContain("SkipToContent");
    expect(MAIN_CONTENT_ID).toBe("conteudo-principal");
  });

  it("platform shell and auth shell expose stable main landmark", () => {
    const platform = read("src", "app", "(platform)", "layout.tsx");
    const auth = read("src", "components", "auth", "auth-shell.tsx");
    const skip = read("src", "components", "a11y", "skip-to-content.tsx");
    expect(platform).toContain("MAIN_CONTENT_ID");
    expect(platform).toContain("min-h-app");
    expect(auth).toContain("MAIN_CONTENT_ID");
    expect(auth).toContain("safe-header-pad");
    expect(skip).toContain("Pular para o conteúdo");
    expect(skip).toContain("MAIN_CONTENT_ID");
  });

  it("nav and composer use safe-area and adequate tap targets", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    const marketing = read("src", "components", "marketing", "site-chrome.tsx");
    const chat = read("src", "components", "chat", "chat-panel.tsx");
    expect(nav).toContain("pt-safe");
    expect(nav).toContain("h-11 w-11");
    expect(nav).toContain("min-h-11");
    expect(marketing).toContain("pt-safe");
    expect(marketing).toContain("Escape");
    expect(marketing).toContain("min-h-11");
    expect(chat).toContain("chat-shell-min-h");
    expect(chat).toContain("safe-composer-pad");
    expect(chat).toContain("overflow-x-hidden");
    expect(chat).toContain("text-base");
    expect(chat).toContain("max-h-40");
    expect(chat).toContain("h-5 w-5");
    expect(chat).toContain("Tentar de novo");
    expect(chat).toContain("/entrar?next=/conversar");
    expect(chat).toContain("aria-busy");
    expect(chat).not.toContain("visualViewport");
  });

  it("conversas distinguishes load error from empty state", () => {
    const page = read("src", "app", "(platform)", "conversas", "page.tsx");
    expect(page).toContain("loadError");
    expect(page).toContain("RefreshPageButton");
    expect(page).toContain("Não foi possível carregar suas conversas");
    expect(page).toContain("EmptyState");
    expect(page).toContain("Nenhuma conversa ainda");
    expect(page).toContain("Nova reflexão");
    expect(page).toContain("Retomar conversa");
    expect(page).toContain('redirect("/entrar?next=/conversas")');
  });

  it("global loading and error boundaries announce status and focus", () => {
    const loading = read("src", "app", "loading.tsx");
    const error = read("src", "app", "error.tsx");
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain("aria-busy");
    expect(error).toContain("titleRef");
    expect(error).toContain("min-h-11");
    expect(error).toContain("focus-visible:ring");
    expect(error).not.toContain("error.stack");
    expect(error).not.toContain("{error.message}");
  });

  it("auth forms keep autocomplete and enlarge submit targets", () => {
    const signup = read("src", "components", "auth", "sign-up-form.tsx");
    const login = read("src", "components", "auth", "login-form.tsx");
    expect(signup).toContain('autoComplete="email"');
    expect(signup).toContain('autoComplete="new-password"');
    expect(signup).toContain("inputMode");
    expect(signup).toContain("min-h-11");
    expect(signup).toContain("focusFirstError");
    expect(signup).toContain("aria-describedby");
    expect(signup).toContain("aria-busy");
    expect(login).toContain('autoComplete="email"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login).toContain("min-h-11");
    expect(login).toContain("aria-busy");
  });

  it("does not alter billing theology or eval harness entrypoints", () => {
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    const theology = read("src", "lib", "theology", "general-rules.ts");
    const evalIndex = read("src", "lib", "evals", "theology", "index.ts");
    expect(checkout).toContain("createSubscriptionCheckout");
    expect(theology).toContain("Não afirme ser Jesus");
    expect(evalIndex).toContain("runTheologyEval");
  });
});
