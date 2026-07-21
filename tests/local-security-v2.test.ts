import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { resolveAuthorizedPersonaKey } from "@/lib/ai/chat-persona";
import { sanitizeComposerDraft } from "@/lib/conversations/composer-draft";
import { isUuid, safeNextPath } from "@/lib/navigation/safe-next-path";
import { parseAdminUserListSearchParams } from "@/lib/admin/user-list-params";
import { filterHelpFaq } from "@/lib/support/help-center";
import { buildJourneyStepChatPrefill } from "@/lib/journeys/chat-prefill";

describe("local security V2 — negative inputs", () => {
  describe("safeNextPath", () => {
    it("rejects open redirects, schemes, and protocol-relative URLs", () => {
      expect(safeNextPath("https://evil.test/x", "/inicio")).toBe("/inicio");
      expect(safeNextPath("//evil.test", "/inicio")).toBe("/inicio");
      expect(safeNextPath("/\\evil", "/inicio")).toBe("/inicio");
      expect(safeNextPath("javascript:alert(1)", "/inicio")).toBe("/inicio");
      expect(safeNextPath("/javascript:alert(1)", "/inicio")).toBe("/inicio");
      expect(safeNextPath("/inicio?x=javascript:alert(1)", "/inicio")).toBe(
        "/inicio",
      );
      expect(safeNextPath("data:text/html,hi", "/inicio")).toBe("/inicio");
      expect(safeNextPath("/ok/path", "/inicio")).toBe("/ok/path");
    });

    it("rejects control characters and oversized paths", () => {
      expect(safeNextPath("/inicio\u0000/x", "/inicio")).toBe("/inicio");
      expect(safeNextPath(`/${"a".repeat(3000)}`, "/inicio")).toBe("/inicio");
    });
  });

  describe("chat request schema", () => {
    it("rejects foreign fields, long payloads, and non-uuid conversation ids", () => {
      const long = "x".repeat(4001);
      expect(() =>
        chatRequestSchema.parse({
          message: long,
          personaKey: "jesus",
        }),
      ).toThrow();
      expect(() =>
        chatRequestSchema.parse({
          message: "ok",
          conversationId: "not-a-uuid",
          personaKey: "jesus",
        }),
      ).toThrow();
      const parsed = chatRequestSchema.parse({
        message: "ok",
        personaKey: "jesus",
        userId: "attacker",
        role: "assistant",
      } as Record<string, unknown>);
      expect(parsed).not.toHaveProperty("userId");
      expect(parsed).not.toHaveProperty("role");
    });
  });

  describe("persona allowlist", () => {
    it("falls back on injection-like and unknown persona keys", () => {
      const tradition = "ecumenical" as const;
      expect(
        resolveAuthorizedPersonaKey({
          requested: '<script>alert(1)</script>',
          traditionKey: tradition,
          saintsContentEnabled: false,
        }).fellBack,
      ).toBe(true);
      expect(
        resolveAuthorizedPersonaKey({
          requested: "jesus'; DROP TABLE--",
          traditionKey: tradition,
          saintsContentEnabled: false,
        }).fellBack,
      ).toBe(true);
      expect(
        resolveAuthorizedPersonaKey({
          requested: "a".repeat(64),
          traditionKey: tradition,
          saintsContentEnabled: false,
        }).fellBack,
      ).toBe(true);
    });
  });

  describe("admin filters and help search", () => {
    it("strips dangerous utm and repeated array params to first value", () => {
      const filters = parseAdminUserListSearchParams({
        utm: ["share", "evil;drop"],
        utm_medium: "cpc<script>",
        q: `<img src=x onerror=alert(1)>${"y".repeat(200)}`,
      });
      expect(filters.utmSource).toBe("share");
      expect(filters.utmMedium).toBeUndefined();
      expect(filters.q?.length).toBeLessThanOrEqual(120);
      expect(filters.q).not.toMatch(/onerror/i);
    });

    it("help FAQ filter does not execute HTML in query", () => {
      const items = filterHelpFaq("<script>alert(1)</script>");
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe("composer draft and journey prefill", () => {
    it("strips control characters from drafts", () => {
      expect(sanitizeComposerDraft("ola\u0007mundo")).toBe("olamundo");
    });

    it("rejects unknown journey/step prefill", () => {
      expect(
        buildJourneyStepChatPrefill("nao-existe", "também-não"),
      ).toBeFalsy();
    });
  });

  describe("uuid guard", () => {
    it("accepts only RFC-like uuids", () => {
      expect(isUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(true);
      expect(isUuid("javascript:uuid")).toBe(false);
      expect(isUuid("")).toBe(false);
    });
  });
});
