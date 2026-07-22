import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveChatClientError } from "@/lib/ai/chat-client-errors";
import {
  STABLE_CHAT_ERROR_CODES,
  classifyFailureKind,
  isStableChatErrorCode,
  isStableErrorCode,
  isStableJourneyErrorCode,
  isStableOpsErrorCode,
} from "@/lib/observability/stable-error-codes";

describe("performance V4 — journey progress request cache", () => {
  it("caches journey progress loaders with React.cache", () => {
    const server = readFileSync(
      join(process.cwd(), "src/lib/journeys/server.ts"),
      "utf8",
    );
    expect(server).toContain('import { cache } from "react"');
    expect(server).toContain("export const loadJourneyProgressMap = cache");
    expect(server).toContain("export const loadJourneyProgress = cache");
  });
});

describe("observability V3 — stable error codes", () => {
  it("classifies expected client failures vs unexpected", () => {
    expect(classifyFailureKind(404, "conversation_not_found")).toBe("expected");
    expect(classifyFailureKind(429, "budget_exceeded")).toBe("expected");
    expect(classifyFailureKind(500, "ai_failed")).toBe("unexpected");
    expect(isStableChatErrorCode("conversation_not_found")).toBe(true);
    expect(isStableChatErrorCode("personalization_required")).toBe(true);
    expect(isStableChatErrorCode("ai_identity_violation")).toBe(true);
    expect(isStableChatErrorCode("totally_unknown")).toBe(false);
  });

  it("recognizes journey and ops catalogs without treating unknown as stable", () => {
    expect(isStableJourneyErrorCode("journey_not_found")).toBe(true);
    expect(isStableJourneyErrorCode("step_not_found")).toBe(true);
    expect(isStableOpsErrorCode("export_failed")).toBe(true);
    expect(isStableOpsErrorCode("cron_unauthorized")).toBe(true);
    expect(isStableErrorCode("unsafe_input")).toBe(true);
    expect(isStableErrorCode("invented_code")).toBe(false);
  });

  it("keeps chat client map covering catalogued codes without spiritual leak", () => {
    for (const code of STABLE_CHAT_ERROR_CODES) {
      const view = resolveChatClientError({
        status: code.includes("not_found")
          ? 404
          : code === "subscription_required"
            ? 402
            : code === "turn_in_progress"
              ? 409
              : code.includes("exceeded") ||
                  code === "rate_limited" ||
                  code === "ai_provider_rate_limited"
                ? 429
                : code.startsWith("ai_") ||
                    code.includes("unavailable") ||
                    code.includes("unconfigured") ||
                    code === "biblical_corpus_invalid"
                  ? 503
                  : 400,
        code,
      });
      expect(view.message.length).toBeGreaterThan(0);
      expect(view.message.toLowerCase()).not.toMatch(
        /conteúdo da conversa|mensagem do usuário/,
      );
    }
  });
});
