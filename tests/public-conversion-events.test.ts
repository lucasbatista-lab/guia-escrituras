import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";
import { isSyntheticQaAcquisition } from "@/lib/acquisition/synthetic-qa";
import { PUBLIC_CONVERSION_PATH_ALLOWLIST } from "@/lib/acquisition/public-event-paths";

const { info, warn, insertMock } = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: { info, warn, error: vi.fn() },
}));

vi.mock("@/lib/supabase/keys", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
}));

vi.mock("@/lib/supabase/secret", () => ({
  hasSupabaseSecretKey: () => true,
  getSupabaseSecretKey: () => "secret",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

import { GET, POST } from "@/app/api/acquisition/events/route";

const root = process.cwd();

function eventRequest(
  body: Record<string, unknown>,
  origin = "https://amemchat.com.br",
) {
  return new NextRequest("https://amemchat.com.br/api/acquisition/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin,
    },
    body: JSON.stringify(body),
  });
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "plan_selected",
    event_id: "11111111-1111-4111-8111-111111111111",
    session_key: "22222222-2222-4222-8222-222222222222",
    path: "/planos",
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "onda-1",
    utm_content: "reel-ansiedade",
    plan: "caminho",
    viewport_class: "mobile",
    ...overrides,
  };
}

describe("public conversion events", () => {
  beforeEach(() => {
    info.mockClear();
    warn.mockClear();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it("keeps the approved event allowlist", () => {
    expect(PUBLIC_CONVERSION_EVENTS).toEqual([
      "landing_viewed",
      "product_demo_viewed",
      "product_demo_topic_selected",
      "plans_cta_clicked",
      "plan_selected",
      "signup_started",
      "paid_landing_viewed",
      "paid_landing_primary_cta_clicked",
      "paid_landing_demo_clicked",
      "paid_landing_demo_viewed",
      "paid_landing_plans_viewed",
      "paid_landing_plan_selected",
    ]);
  });

  it("logs and persists only sanitized non-sensitive conversion metadata", async () => {
    const response = await POST(eventRequest(validPayload()));
    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      ok: boolean;
      persist: { stored: boolean; duplicate: boolean; reason: string | null };
    };
    expect(body).toEqual({
      ok: true,
      persist: { stored: true, duplicate: false, reason: null },
    });
    expect(info).toHaveBeenCalledWith(
      "public_conversion_event",
      expect.objectContaining({
        event: "plan_selected",
        path: "/planos",
        plan: "caminho",
        viewport_class: "mobile",
        event_id: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(info).toHaveBeenCalledWith(
      "public_conversion_persisted",
      expect.objectContaining({
        event_id: "11111111-1111-4111-8111-111111111111",
      }),
    );
    const metadata = info.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata).not.toHaveProperty("email");
    expect(metadata).not.toHaveProperty("message");
    expect(metadata).not.toHaveProperty("topic");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "11111111-1111-4111-8111-111111111111",
        session_key: "22222222-2222-4222-8222-222222222222",
        event_name: "plan_selected",
        path: "/planos",
        viewport_class: "mobile",
        utm_campaign: "onda-1",
        utm_content: "reel-ansiedade",
      }),
    );
    const row = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).not.toHaveProperty("plan");
    expect(row).not.toHaveProperty("email");
  });

  it("treats duplicate event_id as success without double insert error", async () => {
    insertMock.mockResolvedValueOnce({
      error: { code: "23505", message: "duplicate" },
    });
    const response = await POST(eventRequest(validPayload()));
    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      persist: { stored: boolean; duplicate: boolean };
    };
    expect(body.persist).toEqual({
      stored: false,
      duplicate: true,
      reason: null,
    });
    expect(info).toHaveBeenCalledWith(
      "public_conversion_event_duplicate",
      expect.objectContaining({
        event_id: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });

  it("stays fail-open when persistence throws and exposes stored=false", async () => {
    insertMock.mockRejectedValueOnce(new Error("db down"));
    const response = await POST(eventRequest(validPayload()));
    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      persist: { stored: boolean; reason: string | null };
    };
    expect(body.persist.stored).toBe(false);
    expect(body.persist.reason).toBe("exception");
    expect(warn).toHaveBeenCalled();
  });

  it("rejects extra fields, bad path, and cross-origin writes", async () => {
    const withEmail = await POST(
      eventRequest({ ...validPayload(), email: "sensitive@example.com" }),
    );
    expect(withEmail.status).toBe(400);

    const badPath = await POST(
      eventRequest(validPayload({ path: "/conversar" })),
    );
    expect(badPath.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();

    const crossOrigin = await POST(
      eventRequest(validPayload(), "https://example.com"),
    );
    expect(crossOrigin.status).toBe(403);
    expect(info).not.toHaveBeenCalled();
  });

  it("blocks public reads of acquisition events", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it("separates synthetic QA utms for reporting", () => {
    expect(
      isSyntheticQaAcquisition({
        utm_campaign: "launch_readiness",
        utm_content: "audit_final",
      }),
    ).toBe(true);
    expect(
      isSyntheticQaAcquisition({
        utm_source: "meta",
        utm_campaign: "amem_vendas_br_teste_v1_set26",
        utm_content: "ads3_perdao_v1",
      }),
    ).toBe(false);
  });

  it("keeps path allowlist aligned with funnel surfaces", () => {
    expect(PUBLIC_CONVERSION_PATH_ALLOWLIST).toContain("/comece");
    expect(PUBLIC_CONVERSION_PATH_ALLOWLIST).toContain("/cadastro");
    expect(PUBLIC_CONVERSION_PATH_ALLOWLIST).not.toContain("/conversar");
  });

  it("wires all public funnel moments without conversation content", () => {
    const home = readFileSync(
      join(root, "src", "app", "(marketing)", "page.tsx"),
      "utf8",
    );
    const demo = readFileSync(
      join(root, "src", "components", "marketing", "chat-demo.tsx"),
      "utf8",
    );
    const plans = readFileSync(
      join(root, "src", "components", "marketing", "plan-cards.tsx"),
      "utf8",
    );
    const signup = readFileSync(
      join(root, "src", "app", "(auth)", "cadastro", "page.tsx"),
      "utf8",
    );

    expect(home).toContain('event="landing_viewed"');
    expect(home).toContain('conversionEvent="plans_cta_clicked"');
    expect(demo).toContain('event="product_demo_viewed"');
    expect(demo).toContain("product_demo_topic_selected");
    expect(plans).toContain('conversionEvent="plan_selected"');
    expect(signup).toContain('event="signup_started"');

    const paidLandingPage = readFileSync(
      join(root, "src", "app", "(marketing)", "comece", "page.tsx"),
      "utf8",
    );
    const paidLandingCampaign = readFileSync(
      join(
        root,
        "src",
        "components",
        "marketing",
        "paid-landing-v2",
        "paid-landing-campaign.tsx",
      ),
      "utf8",
    );
    expect(paidLandingPage).toContain('mode="production"');
    expect(paidLandingCampaign).toContain('event="paid_landing_viewed"');
    expect(paidLandingCampaign).toContain("paid_landing_primary_cta_clicked");

    const client = readFileSync(
      join(root, "src", "lib", "acquisition", "public-events-client.ts"),
      "utf8",
    );
    expect(client).not.toMatch(/email|message|tradition|health|crisis/i);
    expect(client).toContain("event_id");
    expect(client).toContain("session_key");
    expect(client).toContain("sessionStorage");

    const migration = readFileSync(
      join(
        root,
        "supabase",
        "migrations",
        "20260904000013_public_conversion_events.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.public_conversion_events from anon");
    expect(migration).toContain("event_id");
    expect(migration).not.toContain("token_hash");
    expect(migration).not.toContain("conversation_id");
    expect(migration).not.toMatch(/^\s*email\s/m);
  });
});
