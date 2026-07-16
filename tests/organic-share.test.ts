import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  SHARE_COPIED_FEEDBACK,
  SHARE_TEXT,
  SHARE_TITLE,
  SHARE_UTM_CONTENTS,
  assertShareUtmContent,
  buildOrganicShareUrl,
  buildShareMessage,
  buildWhatsAppShareHref,
  copyTextToClipboard,
  isOrganicShareUrl,
  isShareUtmContent,
  isUserShareCancellation,
  sanitizeReferralCodeForShare,
} from "@/lib/share";
import { assertNotSelfReferral } from "@/lib/referrals";

describe("share UTM origins", () => {
  it("allows only the three CTA origins", () => {
    expect(SHARE_UTM_CONTENTS).toEqual([
      "home_final_cta",
      "account_share",
      "subscription_success",
    ]);
    expect(isShareUtmContent("home_final_cta")).toBe(true);
    expect(isShareUtmContent("arbitrary")).toBe(false);
    expect(() => assertShareUtmContent("evil")).toThrow("invalid_share_utm_content");
  });
});

describe("buildOrganicShareUrl", () => {
  const origin = "https://amemchat.com.br";

  it("visitor gets generic organic_user URL without ref", () => {
    const url = buildOrganicShareUrl({
      origin,
      content: "home_final_cta",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://amemchat.com.br/");
    expect(parsed.searchParams.get("utm_source")).toBe("share");
    expect(parsed.searchParams.get("utm_medium")).toBe("organic_user");
    expect(parsed.searchParams.get("utm_campaign")).toBe("invite");
    expect(parsed.searchParams.get("utm_content")).toBe("home_final_cta");
    expect(parsed.searchParams.get("ref")).toBeNull();
    expect(url).not.toMatch(/user_id|email|@/i);
  });

  it("authenticated gets user medium + valid ref", () => {
    const url = buildOrganicShareUrl({
      origin,
      content: "account_share",
      referralCode: "abc12def34",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_medium")).toBe("user");
    expect(parsed.searchParams.get("utm_content")).toBe("account_share");
    expect(parsed.searchParams.get("ref")).toBe("abc12def34");
    expect(url).not.toContain("user_id");
    expect(url).not.toMatch(/@/);
  });

  it("falls back to generic when referral is invalid", () => {
    const url = buildOrganicShareUrl({
      origin,
      content: "subscription_success",
      referralCode: "bad code!!",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_medium")).toBe("organic_user");
    expect(parsed.searchParams.get("ref")).toBeNull();
  });

  it("sets correct utm_content per origin", () => {
    for (const content of SHARE_UTM_CONTENTS) {
      const url = buildOrganicShareUrl({ origin, content });
      expect(new URL(url).searchParams.get("utm_content")).toBe(content);
    }
  });

  it("never embeds user_id or email even if passed as fake code", () => {
    expect(sanitizeReferralCodeForShare("user@email.com")).toBeNull();
    expect(sanitizeReferralCodeForShare("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
    const url = buildOrganicShareUrl({
      origin,
      content: "account_share",
      referralCode: "user@email.com",
    });
    expect(url).not.toContain("@");
    expect(url).not.toContain("user_id");
  });
});

describe("share copy helpers", () => {
  it("builds WhatsApp href with encoded text and URL", () => {
    const shareUrl =
      "https://amemchat.com.br/?utm_source=share&utm_medium=organic_user&utm_campaign=invite&utm_content=home_final_cta";
    const href = buildWhatsAppShareHref(shareUrl);
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(href.slice("https://wa.me/?text=".length));
    expect(text).toContain(SHARE_TEXT);
    expect(text).toContain(shareUrl);
    expect(text).not.toMatch(/conversa|mensagem do usuário|openai/i);
  });

  it("share message never includes conversation content", () => {
    const msg = buildShareMessage("https://amemchat.com.br/");
    expect(msg).toContain(SHARE_TEXT);
    expect(msg).not.toContain("reward");
    expect(msg).not.toContain("R$");
    expect(SHARE_TITLE).toContain("Amém Chat");
  });

  it("treats AbortError as user cancellation without error", () => {
    expect(isUserShareCancellation(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(
      true,
    );
    expect(isUserShareCancellation(new Error("fail"))).toBe(false);
  });
});

describe("copyTextToClipboard", () => {
  it("uses Clipboard API when available", async () => {
    const write = vi.fn(async () => undefined);
    const ok = await copyTextToClipboard("https://example.com", {
      clipboardWriteText: write,
    });
    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledWith("https://example.com");
  });

  it("falls back to execCommand when Clipboard API fails", async () => {
    const nodes: Array<{ remove: () => void }> = [];
    const area = {
      value: "",
      setAttribute: vi.fn(),
      style: {} as CSSStyleDeclaration,
      select: vi.fn(),
    };
    const doc = {
      createElement: vi.fn(() => area as unknown as HTMLTextAreaElement),
      body: {
        appendChild: vi.fn((n: { remove: () => void }) => {
          nodes.push(n);
        }),
        removeChild: vi.fn(),
      },
    };
    const ok = await copyTextToClipboard("link", {
      clipboardWriteText: async () => {
        throw new Error("denied");
      },
      document: doc as unknown as Document,
      execCommand: () => true,
    });
    expect(ok).toBe(true);
    expect(area.select).toHaveBeenCalled();
  });

  it("feedback constant is Link copiado", () => {
    expect(SHARE_COPIED_FEEDBACK).toBe("Link copiado");
  });
});

describe("autoindicação continua bloqueada", () => {
  it("assertNotSelfReferral still blocks", () => {
    expect(assertNotSelfReferral("u1", "u1").ok).toBe(false);
  });
});

describe("share CTA placement contracts", () => {
  it("home final CTA has share without touching hero", () => {
    const home = readFileSync("src/app/(marketing)/page.tsx", "utf8");
    expect(home).toContain("home_final_cta");
    expect(home).toContain("Conhece alguém que gostaria dessa proposta?");
    expect(home).toContain("ShareInvite");
    expect(home).toContain("TrackingLink");
    expect(home).toContain('href="/planos"');
    // Hero remains the first major brand block — share only in section 11
    const heroIdx = home.indexOf("Quando a ansiedade aperta");
    const shareIdx = home.indexOf("home_final_cta");
    const ctaFinalIdx = home.indexOf("CTA final");
    expect(heroIdx).toBeGreaterThan(-1);
    expect(shareIdx).toBeGreaterThan(ctaFinalIdx);
    expect(shareIdx).toBeGreaterThan(heroIdx);
  });

  it("account page has share section", () => {
    const page = readFileSync("src/app/(platform)/conta/page.tsx", "utf8");
    expect(page).toContain("Compartilhe com alguém");
    expect(page).toContain("account_share");
    expect(page).toContain("ShareInvite");
    expect(page).toContain("resolveUserShareUrl");
  });

  it("subscription success has secondary share block", () => {
    const page = readFileSync(
      "src/app/(platform)/assinatura/sucesso/page.tsx",
      "utf8",
    );
    expect(page).toContain("subscription_success");
    expect(page).toContain("Talvez alguém próximo também esteja precisando");
    expect(page).toContain("ShareInvite");
    expect(page).toContain("CheckoutSuccessClient");
  });

  it("ShareInvite uses Web Share, WhatsApp, clipboard feedback, no conversation APIs", () => {
    const src = readFileSync("src/components/share/share-invite.tsx", "utf8");
    expect(src).toContain("navigator.share");
    expect(src).toContain("isUserShareCancellation");
    expect(src).toContain("buildWhatsAppShareHref");
    expect(src).toContain("copyTextToClipboard");
    expect(src).toContain("SHARE_COPIED_FEEDBACK");
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain("noopener noreferrer");
    expect(src).not.toMatch(/from ["']@\/lib\/chat|from ["']@\/components\/chat/);
    expect(src).not.toMatch(/reward_pending|comiss[aã]o|ganhe R\$/i);
  });

  it("ensureReferralCode is idempotent-oriented and never selects email", () => {
    const src = readFileSync("src/lib/referrals/ensure-code.ts", "utf8");
    expect(src).toContain("referral_codes");
    expect(src).toContain("owner_user_id");
    expect(src).toContain("maybeSingle");
    expect(src).not.toMatch(/\.select\([^)]*email/);
    expect(src).not.toMatch(/reward_pending|pix|saque/i);
  });

  it("no payment/reward created by share layer", () => {
    const url = readFileSync("src/lib/share/url.ts", "utf8");
    const resolve = readFileSync("src/lib/share/resolve-server.ts", "utf8");
    expect(url + resolve).not.toMatch(/stripe|pix|saque|comiss[aã]o|reward_pending/i);
  });
});

describe("signup_intent and admin still receive share attribution", () => {
  it("isOrganicShareUrl detects share links", () => {
    expect(
      isOrganicShareUrl(
        "https://amemchat.com.br/?utm_source=share&utm_medium=user&utm_campaign=invite&ref=abc",
      ),
    ).toBe(true);
    expect(isOrganicShareUrl("https://amemchat.com.br/?utm_source=instagram")).toBe(
      false,
    );
  });

  it("admin acquisition surfaces share metrics", () => {
    const acq = readFileSync("src/lib/admin/acquisition.ts", "utf8");
    const page = readFileSync("src/app/admin/aquisicao/page.tsx", "utf8");
    expect(acq).toContain("shareSignups");
    expect(acq).toContain("shareSubscriptions");
    expect(acq).toContain("byShareContent");
    expect(acq).toContain("referralWithoutSubscription");
    expect(page).toContain("Cadastros via share");
    expect(page).toContain("Compartilhamentos/indicações");
  });

  it("admin layout still gates non-admin", () => {
    const layout = readFileSync("src/app/admin/layout.tsx", "utf8");
    expect(layout).toContain("isAdmin");
  });
});
