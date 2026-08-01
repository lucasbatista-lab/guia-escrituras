import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_POLICY_VERSION,
  clearAdvertisingCookies,
  hasAdvertisingConsent,
  parseConsentPayload,
  readStoredConsent,
  writeStoredConsent,
} from "@/lib/consent";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(i: number) {
      return Array.from(map.keys())[i] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
}

describe("advertising consent controls", () => {
  afterEach(() => {
    // jsdom may be absent — ignore cleanup failures in node vitest.
    try {
      document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/`;
    } catch {
      /* no DOM */
    }
  });

  it("parses versioned consent without PII fields", () => {
    const raw = JSON.stringify({
      version: CONSENT_POLICY_VERSION,
      advertising: "granted",
      updatedAt: "2026-08-01T12:00:00.000Z",
      email: "should-be-ignored@example.com",
    });
    // Extra fields fail the strict record check — consent must stay lean.
    expect(parseConsentPayload(raw)).toBeNull();

    const ok = parseConsentPayload(
      JSON.stringify({
        version: CONSENT_POLICY_VERSION,
        advertising: "denied",
        updatedAt: "2026-08-01T12:00:00.000Z",
      }),
    );
    expect(ok?.advertising).toBe("denied");
    expect(hasAdvertisingConsent(ok)).toBe(false);
  });

  it("persists grant/deny and clears advertising cookies on revoke", () => {
    const store = memoryStorage();
    // Minimal document/cookie shim for storage helpers.
    const cookieJar = new Map<string, string>();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return Array.from(cookieJar.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join("; ");
        },
        set cookie(value: string) {
          const [pair] = value.split(";");
          const eq = pair.indexOf("=");
          const name = pair.slice(0, eq);
          const raw = pair.slice(eq + 1);
          if (value.includes("Max-Age=0")) cookieJar.delete(name);
          else cookieJar.set(name, raw);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: store,
        location: { protocol: "https:" },
      },
    });

    cookieJar.set("_fbp", "fb.1.1.1");
    cookieJar.set("_fbc", "fb.1.1.token");
    cookieJar.set("amem_acq_first", "keep-me");

    const granted = writeStoredConsent("granted");
    expect(granted.advertising).toBe("granted");
    expect(hasAdvertisingConsent(readStoredConsent())).toBe(true);

    writeStoredConsent("denied");
    clearAdvertisingCookies();
    expect(cookieJar.has("_fbp")).toBe(false);
    expect(cookieJar.has("_fbc")).toBe(false);
    expect(cookieJar.get("amem_acq_first")).toBe("keep-me");
  });

  it("wires non-blocking banner, cookies page, and privacy disclosures", () => {
    const banner = read("src", "components", "consent", "consent-banner.tsx");
    const cookies = read("src", "app", "(marketing)", "cookies", "page.tsx");
    const privacy = read("src", "app", "(marketing)", "privacidade", "page.tsx");
    const layout = read("src", "app", "layout.tsx");

    const constants = read("src", "lib", "consent", "constants.ts");
    expect(layout).toContain("ConsentRoot");
    expect(constants).toContain('accept: "Aceitar"');
    expect(constants).toContain("Recusar");
    expect(constants).toContain("Configurar");
    expect(constants).toContain("campanhas de publicidade");
    expect(banner).toContain("CONSENT_COPY.accept");
    expect(banner).toContain("CONSENT_COPY.refuse");
    expect(banner).toContain("fixed");
    expect(banner).not.toMatch(/LGPD compliant|obrigat[oó]rio/i);
    expect(cookies).toContain("Desativada por padrão");
    expect(cookies).toContain("amem_acq_first");
    expect(privacy).toContain("Meta");
    expect(privacy).toContain("Não enviamos à Meta o");
    expect(privacy).toContain("/cookies");
  });
});
