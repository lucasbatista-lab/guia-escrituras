import { describe, expect, it } from "vitest";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("memory persistence + request_id dedupe", () => {
  it("deduplicates usage events by user_id + request_id", async () => {
    const repos = createMemoryRepositories();
    const first = await repos.usage.insertEvent({
      userId: "u1",
      requestId: "req-1",
      featureType: "chat_standard",
      model: "mock",
      inputTokens: 10,
      outputTokens: 20,
      estimatedCostUsdMicros: 0,
      estimatedCostBrlCents: 0,
      latencyMs: 5,
      success: true,
    });
    const second = await repos.usage.insertEvent({
      userId: "u1",
      requestId: "req-1",
      featureType: "chat_standard",
      model: "mock",
      inputTokens: 10,
      outputTokens: 20,
      estimatedCostUsdMicros: 0,
      estimatedCostBrlCents: 0,
      latencyMs: 5,
      success: true,
    });
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
  });

  it("persists conversations and messages without duplicating assistant by request_id", async () => {
    const repos = createMemoryRepositories();
    const conversation = await repos.conversations.create({
      userId: "u1",
      personaKey: "jesus",
      title: "Teste",
    });
    await repos.messages.insertUserMessage({
      conversationId: conversation.id,
      userId: "u1",
      content: "Olá",
      requestId: "r1",
    });
    const a1 = await repos.messages.insertAssistantMessage({
      conversationId: conversation.id,
      userId: "u1",
      content: "Resposta",
      biblicalReferences: [],
      requestId: "r1",
    });
    const a2 = await repos.messages.insertAssistantMessage({
      conversationId: conversation.id,
      userId: "u1",
      content: "Resposta diferente",
      biblicalReferences: [],
      requestId: "r1",
    });
    expect(a1.id).toBe(a2.id);
    expect(a2.content).toBe("Resposta");
    const recent = await repos.messages.listRecent(conversation.id, "u1", 10);
    expect(recent).toHaveLength(2);
  });
});

describe("migration 004 rules", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/20260712000004_production_hardening.sql",
    ),
    "utf8",
  );

  it("removes authenticated usage_events insert and adds uniqueness", () => {
    expect(sql).toContain('drop policy if exists "usage_events_insert_own"');
    expect(sql).toContain("usage_events_user_request_id_uidx");
  });

  it("restricts message inserts to role user", () => {
    expect(sql).toContain("messages_insert_own_user_role");
    expect(sql).toContain("role = 'user'");
  });

  it("removes conversation_summaries authenticated writes", () => {
    expect(sql).toContain(
      'drop policy if exists "conversation_summaries_insert_own"',
    );
    expect(sql).toContain(
      'drop policy if exists "conversation_summaries_update_own"',
    );
  });

  it("hardens security definer functions", () => {
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("revoke all on function public.handle_new_user()");
    expect(sql).toContain(
      "revoke all on function public.compute_daily_report_aggregates(date)",
    );
    expect(sql).toContain("from public.admin_roles ar");
    expect(sql).not.toContain("or public.is_admin()");
    expect(sql).toContain("'revenueBrlCents', null");
    expect(sql).not.toContain("subscriptions_stripe_customer_id_uidx");
    expect(sql).toContain("subscriptions_stripe_customer_id_idx");
    expect(sql).toContain("subscriptions_stripe_subscription_id_uidx");
    expect(sql).not.toContain("where plan_key = 'free'");
  });
});
