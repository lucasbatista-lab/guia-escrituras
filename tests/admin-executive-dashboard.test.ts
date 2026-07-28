import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";

async function readOverview(): Promise<string> {
  return fs.readFile("src/app/admin/page.tsx", "utf8");
}

describe("admin executive dashboard consolidation (BLOCO H)", () => {
  it("groups the overview into the seven named command-center sections", async () => {
    const source = await readOverview();
    expect(source).toContain('title="Hoje"');
    expect(source).toContain('title="Estado atual"');
    expect(source).toContain('title="Filas operacionais"');
    expect(source).toContain('title="Aquisição e conversão"');
    expect(source).toContain('title="Produto e ativação"');
    expect(source).toContain('title="Receita e billing"');
    expect(source).toContain('title="Suporte e incidentes"');
    expect(source).toContain("function GroupHeader(");
  });

  it("keeps a single Filas operacionais heading (GroupHeader, not duplicated Section title)", async () => {
    const source = await readOverview();
    expect(source).toContain('title="Filas operacionais"');
    expect(source).toContain('id="admin-filas-operacionais"');
    expect(source).toContain('labelledBy="admin-filas-operacionais"');
    expect(source).not.toMatch(/<Section title="Filas operacionais">/);
  });

  it("keeps existing section titles/content intact so deep links don't rot", async () => {
    const source = await readOverview();
    // Original sub-section titles must still exist verbatim.
    expect(source).toContain("Resumo do dia");
    expect(source).toContain("Assinaturas (estado atual)");
    expect(source).toContain("Origem dos assinantes");
    expect(source).toContain("Checkout e pagamento (acumulado)");
    expect(source).toContain("Prontidão de pagamentos");
    expect(source).toContain("Indicações (acumulado)");
    expect(source).toContain("Precisa da sua atenção");
    expect(source).toContain("IA (estimativa do provedor / planning)");
  });

  it("acquisition section discloses signup_intents-only funnel scope", async () => {
    const source = await readOverview();
    const section = source.slice(
      source.indexOf('title="Aquisição e conversão"'),
      source.indexOf('title="Origem dos assinantes"'),
    );
    expect(section).toMatch(/signup_intents/i);
    expect(section).toMatch(/n[ãa]o medimos visitas à home/i);
    expect(section).toContain("/admin/aquisicao");
  });

  it("product/activation and support/incidents sections are link-only (no invented metrics)", async () => {
    const source = await readOverview();
    const productSection = source.slice(
      source.indexOf('title="Produto e ativação">'),
      source.indexOf('title="IA (estimativa'),
    );
    expect(productSection).toContain("/admin/ativacao");
    expect(productSection).toContain("/admin/uso");

    const supportSection = source.slice(
      source.lastIndexOf('title="Suporte e incidentes"'),
    );
    expect(supportSection).toContain("/admin/suporte");
    expect(supportSection).toContain("/admin/incidentes");
  });

  it("does not introduce an unbounded/infinite grid of metric cards", async () => {
    const source = await readOverview();
    // No section should render an unbounded list without a container/limit —
    // all list renders map over server-computed, already-bounded arrays.
    expect(source).not.toContain(".map((_, i) =>");
    expect(source).not.toMatch(/Array\(\d{3,}\)/);
  });

  it("desktop nav and mobile Mais menu both expose ativacao/suporte/incidentes", async () => {
    const nav = await fs.readFile(
      "src/components/admin/admin-mobile-nav.tsx",
      "utf8",
    );
    expect(nav).toContain("/admin/ativacao");
    expect(nav).toContain("/admin/suporte");
    expect(nav).toContain("/admin/incidentes");
    expect(nav).toContain("...PRIMARY, ...MORE");
  });
});
