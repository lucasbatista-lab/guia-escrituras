import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("checkout success — paid + email pending states", () => {
  const logic = read("src", "lib", "billing", "checkout-success.ts");
  const client = read(
    "src",
    "components",
    "billing",
    "checkout-success-client.tsx",
  );
  const page = read(
    "src",
    "app",
    "(platform)",
    "assinatura",
    "sucesso",
    "page.tsx",
  );

  it("distinguishes processing, activating, active and sync_error", () => {
    expect(logic).toContain('kind: "activating"');
    expect(logic).toContain('kind: "processing"');
    expect(logic).toContain('kind: "active"');
    expect(logic).toContain('kind: "sync_error"');
    expect(logic).toContain("paymentLooksDone");
    expect(logic).toContain("emailConfirmed");
    expect(client).toContain("Pagamento recebido");
    expect(client).toContain("Confirmando seu pagamento");
    expect(client).toContain("Pagamento confirmado");
    expect(page).toContain('view.kind === "activating"');
  });

  it("explains email gate without requiring a second purchase", () => {
    const clientText = client.replace(/\s+/g, " ");
    expect(clientText).toContain("e-mail precisa ser confirmado");
    expect(clientText).toMatch(
      /não é necessário pagar (outra vez|de novo)/i,
    );
    expect(client).toContain("/confira-seu-email");
    expect(client).toContain("/entrar?next=/personalizar");
    expect(client).toContain("/recuperar-senha");
    expect(client).toContain("Paguei e não consigo acessar");
    // Email-pending copy is for active+unconfirmed — not the activating wait state.
    expect(client).toContain("Pagamento recebido");
    expect(client).toContain(
      "Estamos ativando a assinatura na sua conta",
    );
    expect(clientText).toContain(
      "Sua assinatura está ativa. Personalize em um minuto para liberar Conversar e Caminhos.",
    );
    expect(client).not.toMatch(/checkout\.sessions\.create|createCheckout/i);
  });

  it("keeps DB subscription as authority for active unlock", () => {
    expect(logic).toContain("isActiveSubscription");
    expect(logic).toContain("Never creates a Supabase session from Stripe data");
  });
});
