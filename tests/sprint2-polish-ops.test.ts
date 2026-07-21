import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { redactLogFields } from "@/lib/logging/mask";
import { logger } from "@/lib/logging/logger";
import { SUPPORT_RESPONSE_NOTE } from "@/lib/support/help-center";

const root = process.cwd();

describe("conversion copy — concrete plan differentiation", () => {
  it("home planos copy names journeys and deepen without shaming Essencial", () => {
    const home = readFileSync(
      join(root, "src", "app", "(marketing)", "page.tsx"),
      "utf8",
    );
    expect(home).toContain("Jornadas guiadas");
    expect(home).toContain("Aprofundar sob");
    expect(home).toContain("sem trocar o");
    expect(home).toMatch(/Essencial/);
    expect(home).not.toMatch(/plano inferior|só o básico inútil/i);
  });
});

describe("admin mobile ops v1.1 — attention section", () => {
  it("admin home always shows attention section with mobile-friendly targets", () => {
    const page = readFileSync(
      join(root, "src", "app", "admin", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("Precisa da sua atenção");
    expect(page).toContain("Nenhum alerta operacional agora");
    expect(page).toContain("min-h-11");
  });
});

describe("help center v1.1", () => {
  it("documents crisis non-pastoral boundary and response timing", () => {
    expect(SUPPORT_RESPONSE_NOTE).toMatch(/dias úteis/);
    expect(SUPPORT_RESPONSE_NOTE).not.toMatch(/garantimos|SLA|1 hora/i);
    const help = readFileSync(
      join(root, "src", "lib", "support", "help-center.ts"),
      "utf8",
    );
    expect(help).toContain("CVV");
    expect(help).toContain("não substituem emergência");
    const page = readFileSync(
      join(root, "src", "app", "(marketing)", "ajuda", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("SUPPORT_RESPONSE_NOTE");
  });
});

describe("observability redaction", () => {
  it("redacts spiritual content keys and truncates long strings", () => {
    const out = redactLogFields({
      requestId: "abc",
      message: "conteúdo espiritual sensível",
      answer: "resposta",
      code: "ok",
      long: "x".repeat(300),
    });
    expect(out.message).toBe("[redacted]");
    expect(out.answer).toBe("[redacted]");
    expect(out.requestId).toBe("abc");
    expect(out.code).toBe("ok");
    expect(String(out.long)).toContain("[truncated");
  });

  it("logger applies redaction before console output", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("unit_test_log", { message: "não deve aparecer", requestId: "r1" });
    expect(spy).toHaveBeenCalled();
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("não deve aparecer");
    spy.mockRestore();
  });

  it("health exposes safe checks without secrets", () => {
    const health = readFileSync(
      join(root, "src", "app", "api", "health", "route.ts"),
      "utf8",
    );
    expect(health).toContain("requestId");
    expect(health).toContain("supabasePublicEnv");
    expect(health).not.toContain("OPENAI_API_KEY");
    expect(health).not.toContain("SUPABASE_SECRET");
    expect(health).not.toContain("mocksAllowed");
  });
});
