import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  conversationTitleLabel,
  formatConversationActivity,
  loadLatestResumePreview,
  sanitizeConversationPreview,
} from "@/lib/conversations/resume";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

const sharedRepos = createMemoryRepositories();

vi.mock("@/lib/database/repositories", () => ({
  getRepositories: () => sharedRepos,
}));

describe("conversation resume helpers", () => {
  it("sanitizes and truncates previews without interpreting markup", () => {
    expect(sanitizeConversationPreview("  Olá   mundo  ")).toBe("Olá mundo");
    expect(sanitizeConversationPreview("<b>risco</b> texto")).toBe("risco texto");
    expect(sanitizeConversationPreview("a".repeat(200)).endsWith("…")).toBe(
      true,
    );
    expect(sanitizeConversationPreview("a".repeat(200)).length).toBeLessThanOrEqual(
      121,
    );
    expect(conversationTitleLabel(null)).toBe("Conversa sem título");
    expect(conversationTitleLabel("")).toBe("Conversa sem título");
  });

  it("formats activity in friendly Portuguese", () => {
    const now = new Date("2026-07-16T15:00:00.000Z");
    expect(
      formatConversationActivity(new Date(now.getTime() - 30_000).toISOString(), now),
    ).toBe("agora");
    expect(
      formatConversationActivity(
        new Date(now.getTime() - 5 * 60_000).toISOString(),
        now,
      ),
    ).toBe("há 5 minutos");
  });
});

describe("loadLatestResumePreview", () => {
  beforeEach(() => {
    // Memory store is process-global; use unique user ids per case.
  });

  it("returns null when user has no conversations", async () => {
    const result = await loadLatestResumePreview("resume-empty-user");
    expect(result).toBeNull();
  });

  it("returns the most recently updated conversation with user preview", async () => {
    const userId = "resume-multi-user";
    const older = await sharedRepos.conversations.create({
      userId,
      personaKey: "jesus",
      title: "Conversa antiga",
    });
    await sharedRepos.messages.insertUserMessage({
      conversationId: older.id,
      userId,
      content: "Mensagem antiga do usuário",
      requestId: "r1111111-1111-4111-8111-111111111101",
    });

    // Ensure chronological gap for updated_at.
    await new Promise((r) => setTimeout(r, 5));

    const newer = await sharedRepos.conversations.create({
      userId,
      personaKey: "jesus",
      title: "Conversa recente",
    });
    await sharedRepos.messages.insertUserMessage({
      conversationId: newer.id,
      userId,
      content: "Preciso de paz nesta decisão difícil",
      requestId: "r1111111-1111-4111-8111-111111111102",
    });

    const result = await loadLatestResumePreview(userId);
    expect(result?.conversationId).toBe(newer.id);
    expect(result?.title).toContain("recente");
    expect(result?.preview).toContain("paz");
    expect(result?.preview).not.toMatch(/</);
  });

  it("never returns another user's conversation", async () => {
    const owner = "resume-owner";
    const stranger = "resume-stranger";
    const owned = await sharedRepos.conversations.create({
      userId: owner,
      personaKey: "jesus",
      title: "Só do dono",
    });
    await sharedRepos.messages.insertUserMessage({
      conversationId: owned.id,
      userId: owner,
      content: "Conteúdo privado do dono",
      requestId: "r1111111-1111-4111-8111-111111111103",
    });

    const result = await loadLatestResumePreview(stranger);
    expect(result).toBeNull();
  });

  it("does not create conversations or call OpenAI", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const before = await sharedRepos.conversations.listForUser(
      "resume-no-create",
      50,
    );
    await loadLatestResumePreview("resume-no-create");
    const after = await sharedRepos.conversations.listForUser(
      "resume-no-create",
      50,
    );
    expect(after).toHaveLength(before.length);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("loads at most one conversation and one user message query path", async () => {
    const userId = "resume-n1";
    const listSpy = vi.spyOn(sharedRepos.conversations, "listForUser");
    const latestSpy = vi.spyOn(sharedRepos.messages, "findLatestUserMessage");
    const recentSpy = vi.spyOn(sharedRepos.messages, "listRecent");

    const conv = await sharedRepos.conversations.create({
      userId,
      personaKey: "jesus",
      title: "Tema",
    });
    await sharedRepos.messages.insertUserMessage({
      conversationId: conv.id,
      userId,
      content: "Trecho",
      requestId: "r1111111-1111-4111-8111-111111111104",
    });

    listSpy.mockClear();
    latestSpy.mockClear();
    recentSpy.mockClear();

    await loadLatestResumePreview(userId);
    expect(listSpy).toHaveBeenCalledWith(userId, 1);
    expect(latestSpy).toHaveBeenCalledTimes(1);
    expect(recentSpy).not.toHaveBeenCalled();
  });
});

describe("resume UI contracts", () => {
  it("inicio shows age-based resume copy and safe CTA", () => {
    const page = read("src", "app", "(platform)", "inicio", "page.tsx");
    const display = read("src", "lib", "conversations", "display.ts");
    expect(page).toContain("resumeReturnCopy");
    expect(page).toContain("resumeReturnTone");
    expect(page).toContain("returnCopy.cta");
    expect(display).toContain("Retomar conversa");
    expect(page).toContain("loadLatestResumePreview");
    expect(page).toContain("force-dynamic");
    expect(page).toContain("`/conversar?c=${latest.conversationId}`");
    expect(page).toContain("Começar uma nova reflexão");
    expect(page).not.toContain("memória permanente");
    expect(page).not.toContain("a IA se lembra");
    expect(page).not.toContain("listRecent");
  });

  it("conversas highlights latest and keeps list without full messages", () => {
    const page = read("src", "app", "(platform)", "conversas", "page.tsx");
    const list = read(
      "src",
      "components",
      "conversations",
      "conversation-history-list.tsx",
    );
    expect(list).toContain("Mais recente");
    expect(list).toContain("Retomar conversa");
    expect(list).toContain("formatConversationActivity");
    expect(page).toContain("listForUser");
    expect(page).not.toContain("listRecent");
    expect(page).toContain(
      "Quando você iniciar uma reflexão, ela ficará disponível aqui para retomar com calma",
    );
    expect(page).toContain("force-dynamic");
  });

  it("intentionally skips favorites without schema support", () => {
    const schema = read(
      "supabase",
      "migrations",
      "20260712000001_foundation_schema.sql",
    );
    expect(schema).not.toMatch(/favorit|pinned_at|is_favorite/i);
    const conversas = read("src", "app", "(platform)", "conversas", "page.tsx");
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(conversas).not.toMatch(/favorit/i);
    expect(inicio).not.toMatch(/favorit/i);
  });

  it("does not alter chat deep, Stripe or auth modules", () => {
    const chat = read("src", "lib", "ai", "chat-service.ts");
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    expect(chat).toContain("canUseDeepResponseOnDemand");
    expect(checkout).toContain("assessCheckoutEligibility");
  });

  it("chat panel still links to histórico without regressing deepen", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain('href="/conversas"');
    expect(panel).toContain("Aprofundar esta resposta");
  });
});
