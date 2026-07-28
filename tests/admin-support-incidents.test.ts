import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import {
  SUPPORT_CAPACITY_NOTE,
  SUPPORT_CATEGORIES,
  SUPPORT_TRIAGE_STEPS,
} from "@/lib/admin/support-sop";
import { CRISIS_MARKER_MODEL_VALUE } from "@/lib/admin/incidents";

describe("support SOP data", () => {
  it("declares email-only support with no ticket/queue promise", () => {
    expect(SUPPORT_CAPACITY_NOTE).toMatch(/e-mail/i);
    expect(SUPPORT_CAPACITY_NOTE).toMatch(/sem fila/i);
  });

  it("reuses the same categories as the public help center", () => {
    expect(SUPPORT_CATEGORIES.length).toBeGreaterThan(0);
    expect(SUPPORT_CATEGORIES.some((c) => c.id === "cobranca")).toBe(true);
  });

  it("has an ordered triage checklist ending in escalation", () => {
    expect(SUPPORT_TRIAGE_STEPS.length).toBeGreaterThanOrEqual(3);
    const steps = SUPPORT_TRIAGE_STEPS.map((s) => s.step);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });
});

describe("crisis marker constant", () => {
  it("matches the exact runtime marker set by the crisis safety intercept", () => {
    expect(CRISIS_MARKER_MODEL_VALUE).toBe("crisis_safety");
  });
});

describe("admin incidents helper source contracts", () => {
  it("counts crisis interceptions only via the model technical marker", async () => {
    const source = await fs.readFile("src/lib/admin/incidents.ts", "utf8");
    expect(source).toContain('eq("model", CRISIS_MARKER_MODEL_VALUE)');
    expect(source).toContain('{ count: "exact", head: true }');
    expect(source).not.toContain("select(\"content");
    expect(source).not.toContain('from("messages")');
    expect(source).not.toContain("conversation_summaries");
  });
});

describe("admin health status panel", () => {
  it("uses a bounded timeout and never reports failure as automatic down", async () => {
    const source = await fs.readFile(
      "src/components/admin/health-status-panel.tsx",
      "utf8",
    );
    expect(source).toContain("AbortController");
    expect(source).toContain("setTimeout");
    expect(source).toContain("Indisponível para verificação");
    expect(source).toContain("/api/health");
    expect(source).toContain("/api/health/db");
  });
});

describe("admin suporte page", () => {
  it("declares email-only support and never renders a ticket save form", async () => {
    const source = await fs.readFile("src/app/admin/suporte/page.tsx", "utf8");
    expect(source).toContain("SUPPORT_CAPACITY_NOTE");
    expect(source).toContain("getSupportEmail");
    expect(source).toContain("buildSupportMailto");
    expect(source).not.toContain("<form");
    expect(source).not.toMatch(/method=["']post["']/i);
    expect(source).not.toMatch(/Salvar chamado|Criar ticket|Abrir chamado/i);
    expect(source).not.toContain('from("');
  });
});

describe("admin incidentes page", () => {
  it("reuses operational alerts, health panel, crisis snapshot and daily report", async () => {
    const source = await fs.readFile(
      "src/app/admin/incidentes/page.tsx",
      "utf8",
    );
    expect(source).toContain("buildOperationalAlerts");
    expect(source).toContain("HealthStatusPanel");
    expect(source).toContain("getAdminCrisisSnapshot");
    expect(source).toContain("getStoredDailyReports");
    expect(source).toContain("eventos?status=received_stuck");
    expect(source).toContain("eventos?status=failed");
    expect(source).toContain("past_due=1");
    expect(source).not.toContain('from("messages")');
  });
});

describe("admin nav exposes suporte and incidentes in Mais", () => {
  it("adds both routes to the MORE menu", async () => {
    const source = await fs.readFile(
      "src/components/admin/admin-mobile-nav.tsx",
      "utf8",
    );
    expect(source).toContain('"/admin/suporte"');
    expect(source).toContain('"/admin/incidentes"');
  });
});
