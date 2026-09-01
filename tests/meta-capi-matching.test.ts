import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashMetaEmail,
  hashMetaExternalId,
  normalizeMetaEmail,
} from "@/lib/meta/capi-hash";
import {
  buildCapiEventPayload,
  sanitizeFbc,
  sanitizeFbp,
} from "@/lib/meta/capi-sanitize";
import {
  extractClientIpFromHeaders,
  extractClientUserAgentFromHeaders,
  sanitizeClientIp,
  sanitizeClientUserAgent,
  truncateStripeMetadataValue,
} from "@/lib/meta/request-client";
import { buildAdsSessionMetadata } from "@/lib/meta/emit-checkout-conversions";
import { META_SESSION_META } from "@/lib/meta/ads-checkout-context";

const KNOWN_EMAIL = "User@Example.COM";
const KNOWN_EMAIL_HASH = createHash("sha256")
  .update("user@example.com", "utf8")
  .digest("hex");

const USER_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const USER_UUID_HASH = createHash("sha256")
  .update(USER_UUID, "utf8")
  .digest("hex");

describe("meta CAPI matching — FBP/FBC", () => {
  it("accepts real fb.2._fbp format", () => {
    const fbp = "fb.2.1558602934389.1234567890123";
    expect(sanitizeFbp(fbp)).toBe(fbp);
  });

  it("accepts valid fb.1._fbp format", () => {
    const fbp = "fb.1.1700000000.1234567890";
    expect(sanitizeFbp(fbp)).toBe(fbp);
  });

  it("accepts valid fb.1._fbc format", () => {
    const fbc = "fb.1.1700000000.AbCdEfGhIj";
    expect(sanitizeFbc(fbc)).toBe(fbc);
  });

  it("rejects injected or arbitrary strings", () => {
    expect(sanitizeFbp("fb.2.evil")).toBeNull();
    expect(sanitizeFbp("not-fb.2.1.1")).toBeNull();
    expect(sanitizeFbc("fb.1.1.<script>")).toBeNull();
    expect(sanitizeFbp("fb.1.9999999999999.1")).toBeNull();
  });

  it("rejects oversized values and empty", () => {
    expect(sanitizeFbp("")).toBeNull();
    expect(sanitizeFbp(null)).toBeNull();
    const huge = "fb.1.1700000000." + "a".repeat(200);
    expect(sanitizeFbp(huge)).toBeNull();
  });
});

describe("meta CAPI matching — email and external_id hash", () => {
  it("normalizes email trim + lowercase", () => {
    expect(normalizeMetaEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("produces known SHA-256 hex lowercase", () => {
    expect(hashMetaEmail(KNOWN_EMAIL)).toBe(KNOWN_EMAIL_HASH);
    expect(hashMetaExternalId(USER_UUID)).toBe(USER_UUID_HASH);
  });

  it("never puts plaintext email in payload", () => {
    const payload = buildCapiEventPayload({
      eventName: "InitiateCheckout",
      eventId: "evt_ic_hash",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
      actionSource: "website",
      userData: {
        email: KNOWN_EMAIL,
        userId: USER_UUID,
      },
      customData: { value: 58, currency: "BRL" },
    });
    const json = JSON.stringify(payload);
    expect(json).not.toContain("user@example.com");
    expect(json).not.toContain("User@Example");
    expect(payload?.user_data).toMatchObject({
      em: [KNOWN_EMAIL_HASH],
      external_id: [USER_UUID_HASH],
    });
  });

  it("keeps stable external_id across InitiateCheckout and Purchase", () => {
    const ic = buildCapiEventPayload({
      eventName: "InitiateCheckout",
      eventId: "evt_ic",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/x",
      actionSource: "website",
      userData: { userId: USER_UUID },
    });
    const purchase = buildCapiEventPayload({
      eventName: "Purchase",
      eventId: "evt_p",
      eventTime: 1_700_000_001,
      eventSourceUrl: "https://amemchat.com.br/x",
      actionSource: "website",
      userData: { userId: USER_UUID },
    });
    const icExt = (ic?.user_data as { external_id?: string[] }).external_id;
    const pExt = (purchase?.user_data as { external_id?: string[] }).external_id;
    expect(icExt).toEqual([USER_UUID_HASH]);
    expect(pExt).toEqual([USER_UUID_HASH]);
  });
});

describe("meta CAPI matching — IP and User-Agent", () => {
  it("accepts IPv4 and IPv6", () => {
    expect(sanitizeClientIp("192.168.1.1")).toBe("192.168.1.1");
    expect(sanitizeClientIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
      "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    );
  });

  it("rejects invalid IP injection", () => {
    expect(sanitizeClientIp("not-an-ip")).toBeNull();
    expect(sanitizeClientIp("192.168.1.999")).toBeNull();
  });

  it("extracts first valid IP from x-forwarded-for chain", () => {
    const headers = {
      get(name: string) {
        if (name === "x-forwarded-for") return "203.0.113.1, 10.0.0.1";
        return null;
      },
    };
    expect(extractClientIpFromHeaders(headers)).toBe("203.0.113.1");
  });

  it("sanitizes long UA and control characters", () => {
    const ua = "Mozilla/5.0\x00" + "x".repeat(600);
    const cleaned = sanitizeClientUserAgent(ua);
    expect(cleaned).not.toContain("\x00");
    expect(cleaned!.length).toBeLessThanOrEqual(480);
    expect(extractClientUserAgentFromHeaders({
      get(name: string) {
        return name === "user-agent" ? ua : null;
      },
    })).toBe(cleaned);
  });
});

describe("meta CAPI matching — consent gate and prohibited data", () => {
  const FORBIDDEN_SNIPPETS = [
    "evangelico",
    "catolico",
    "conversa",
    "prompt",
    "crise",
    "plan_key",
    "jornada",
  ];

  it("denied consent produces empty ads metadata", () => {
    expect(
      buildAdsSessionMetadata({
        advertisingConsent: false,
        eventSourceUrl: "https://amemchat.com.br/x",
        fbp: "fb.1.1700000000.1",
        fbc: "fb.1.1700000000.AbC",
        eventId: "evt",
      }),
    ).toEqual({});
  });

  it("granted consent includes IP/UA in metadata when provided", () => {
    const meta = buildAdsSessionMetadata(
      {
        advertisingConsent: true,
        eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
        fbp: "fb.2.1700000000.1234567890",
        fbc: "fb.1.1700000000.AbC",
        eventId: "evt_ic_1",
      },
      { clientIp: "203.0.113.50", clientUa: "Mozilla/5.0 Test" },
    );
    expect(meta[META_SESSION_META.consent]).toBe("granted");
    expect(meta[META_SESSION_META.clientIp]).toBe("203.0.113.50");
    expect(meta[META_SESSION_META.clientUa]).toBe("Mozilla/5.0 Test");
    expect(meta).not.toHaveProperty("plan_key");
    expect(meta).not.toHaveProperty("user_id");
  });

  it("InitiateCheckout payload has full matching fields without forbidden data", () => {
    const payload = buildCapiEventPayload({
      eventName: "InitiateCheckout",
      eventId: "evt_ic_full",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
      actionSource: "website",
      userData: {
        email: "buyer@example.com",
        userId: USER_UUID,
        fbp: "fb.2.1700000000.1234567890",
        fbc: "fb.1.1700000000.AbC",
        clientIpAddress: "203.0.113.50",
        clientUserAgent: "Mozilla/5.0",
      },
      customData: { value: 58, currency: "BRL" },
    });
    expect(payload).toMatchObject({
      event_name: "InitiateCheckout",
      action_source: "website",
      custom_data: { value: 58, currency: "BRL" },
    });
    const ud = payload?.user_data as Record<string, unknown>;
    expect(ud.em).toBeDefined();
    expect(ud.external_id).toBeDefined();
    expect(ud.fbp).toBe("fb.2.1700000000.1234567890");
    expect(ud.client_ip_address).toBe("203.0.113.50");
    expect(ud.client_user_agent).toBe("Mozilla/5.0");

    const json = JSON.stringify(payload).toLowerCase();
    for (const snippet of FORBIDDEN_SNIPPETS) {
      expect(json).not.toContain(snippet);
    }
    expect(json).not.toContain("buyer@example.com");
  });

  it("truncates Stripe metadata values safely", () => {
    const long = "a".repeat(600);
    expect(truncateStripeMetadataValue(long).length).toBe(500);
  });
});

describe("meta CAPI matching — denied user_data fields absent", () => {
  it("builds empty user_data when no fields provided", () => {
    const payload = buildCapiEventPayload({
      eventName: "Purchase",
      eventId: "evt_empty",
      eventTime: 1_700_000_000,
      eventSourceUrl: null,
      actionSource: "website",
    });
    expect(payload?.user_data).toEqual({});
  });
});
