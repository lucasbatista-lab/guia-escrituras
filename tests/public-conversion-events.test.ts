import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";

const { info } = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock("@/lib/logging/logger", () => ({
  logger: { info },
}));

import { POST } from "@/app/api/acquisition/events/route";

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

function validPayload() {
  return {
    event: "plan_selected",
    path: "/planos",
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "onda-1",
    utm_content: "reel-ansiedade",
    plan: "caminho",
    viewport_class: "mobile",
  };
}

describe("public conversion events", () => {
  beforeEach(() => {
    info.mockClear();
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
      "paid_landing_plan_selected",
    ]);
  });

  it("logs only sanitized non-sensitive conversion metadata", async () => {
    const response = await POST(eventRequest(validPayload()));
    expect(response.status).toBe(202);
    expect(info).toHaveBeenCalledWith(
      "public_conversion_event",
      expect.objectContaining({
        event: "plan_selected",
        path: "/planos",
        plan: "caminho",
        viewport_class: "mobile",
      }),
    );
    const metadata = info.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata).not.toHaveProperty("email");
    expect(metadata).not.toHaveProperty("message");
    expect(metadata).not.toHaveProperty("topic");
  });

  it("rejects extra fields and cross-origin writes", async () => {
    const withEmail = await POST(
      eventRequest({ ...validPayload(), email: "sensitive@example.com" }),
    );
    expect(withEmail.status).toBe(400);

    const crossOrigin = await POST(
      eventRequest(validPayload(), "https://example.com"),
    );
    expect(crossOrigin.status).toBe(403);
    expect(info).not.toHaveBeenCalled();
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

    const paidLanding = readFileSync(
      join(root, "src", "app", "(marketing)", "comece", "page.tsx"),
      "utf8",
    );
    expect(paidLanding).toContain('event="paid_landing_viewed"');
    expect(paidLanding).toContain("paid_landing_primary_cta_clicked");

    const client = readFileSync(
      join(root, "src", "lib", "acquisition", "public-events-client.ts"),
      "utf8",
    );
    expect(client).not.toMatch(/email|message|tradition|health|crisis/i);
  });
});
