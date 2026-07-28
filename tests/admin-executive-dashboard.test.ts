import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";

async function readOverview(): Promise<string> {
  return fs.readFile("src/app/admin/page.tsx", "utf8");
}

describe("admin executive command dashboard (BLOCO J)", () => {
  it("leads with command strip, priority alerts, today KPIs, then queues", async () => {
    const source = await readOverview();
    const commandIdx = source.indexOf("admin-command-strip");
    const alertsIdx = source.indexOf("Alertas prioritários");
    const todayIdx = source.indexOf('title="Hoje"');
    const queuesIdx = source.indexOf('id="admin-filas-operacionais"');
    const pillarsIdx = source.indexOf("Visão por pilares");
    expect(commandIdx).toBeGreaterThan(-1);
    expect(alertsIdx).toBeGreaterThan(commandIdx);
    expect(todayIdx).toBeGreaterThan(alertsIdx);
    expect(queuesIdx).toBeGreaterThan(todayIdx);
    expect(pillarsIdx).toBeGreaterThan(queuesIdx);
  });

  it("keeps a single Filas operacionais heading without duplicated Section title", async () => {
    const source = await readOverview();
    expect(source).toContain('id="admin-filas-operacionais"');
    expect(source).toContain('labelledBy="admin-filas-operacionais"');
    expect(source).not.toMatch(/<AdminSection title="Filas operacionais"/);
  });

  it("differentiates alert levels with text labels and uses honest calm status copy", async () => {
    const source = await readOverview();
    expect(source).toContain("AdminAlertItem");
    expect(source).toContain("Sem alertas críticos detectados");
    expect(source).toMatch(/integrações disponíveis/i);
    expect(source).toContain('level={alert.level}');
  });

  it("surfaces priority queues with urgency and Ver fila actions", async () => {
    const source = await readOverview();
    expect(source).toContain("AdminQueueItem");
    expect(source).toContain("Pagamentos em risco");
    expect(source).toContain("Checkout parado");
    expect(source).toContain("Assinou e nunca conversou");
    expect(source).toContain("Aguardando confirmação");
    expect(source).toContain("Cancelamento agendado");
    expect(source).toContain("emphasize");
  });

  it("acquisition pillar discloses signup_intents-only funnel scope", async () => {
    const source = await readOverview();
    expect(source).toMatch(/signup_intents/i);
    expect(source).toMatch(/n[ãa]o inclui visitas à home/i);
    expect(source).toContain("/admin/aquisicao");
  });

  it("product and operation pillars link without inventing metrics", async () => {
    const source = await readOverview();
    expect(source).toContain("/admin/ativacao");
    expect(source).toContain("/admin/uso");
    expect(source).toContain("/admin/suporte");
    expect(source).toContain("/admin/incidentes");
    expect(source).toContain("AdminPillarBlock");
  });

  it("marks external tools distinctly from internal routes", async () => {
    const source = await readOverview();
    expect(source).toContain("AdminExternalToolLink");
    expect(source).toContain("dashboard.stripe.com");
    expect(source).toContain("Ferramentas externas");
  });

  it("preserves PARCIAL / INDISPONÍVEL honesty and America/Sao_Paulo", async () => {
    const source = await readOverview();
    expect(source).toContain("PARCIAL");
    expect(source).toContain("America/Sao_Paulo");
    expect(source).toContain("unavailable");
    expect(source).toContain("operationalDayLabel");
  });

  it("does not introduce an unbounded grid of metric cards", async () => {
    const source = await readOverview();
    expect(source).not.toContain(".map((_, i) =>");
    expect(source).not.toMatch(/Array\(\d{3,}\)/);
  });

  it("desktop sidebar and mobile menu both expose ativacao/suporte/incidentes", async () => {
    const nav = await fs.readFile(
      "src/components/admin/admin-mobile-nav.tsx",
      "utf8",
    );
    const config = await fs.readFile("src/lib/admin/nav.ts", "utf8");
    expect(config).toContain("/admin/ativacao");
    expect(config).toContain("/admin/suporte");
    expect(config).toContain("/admin/incidentes");
    expect(nav).toContain("ADMIN_NAV_GROUPS");
    expect(nav).toContain("ADMIN_MOBILE_PRIMARY");
  });
});
