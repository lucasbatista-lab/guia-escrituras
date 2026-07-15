import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getPlatformNavItemsForState,
  journeyAllowsChat,
} from "@/lib/journey";
import {
  preferredDepthLabelPt,
  responseStyleLabelPt,
  traditionLabelPt,
} from "@/lib/profile/labels-pt";
import { brand } from "@/config/brand";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const JARGON =
  /\b(onboarding|política teológica|mentor principal|persona_key|foundation)\b/i;

function publicCopy(source: string) {
  return source
    .replace(/from\s+["'][^"']+["']/g, "")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["']/g, "");
}

describe("authenticated UX polish", () => {
  it("inicio covers journey CTAs and progress without chat cards when unpaid", () => {
    const page = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(page).toContain("Continuar para pagamento");
    expect(page).toContain("Escolher meu plano");
    expect(page).toContain("Personalizar minha experiência");
    expect(page).toContain("Seu plano está ativo");
    expect(page).toContain("Começar uma reflexão");
    expect(page).toContain("ProgressSteps");
    expect(page).toContain("Plano");
    expect(page).toContain("Conta");
    expect(page).toContain("Pagamento");
    expect(page).toContain("Personalização");
    expect(page).toContain("Primeira reflexão");
    expect(page).toContain("Começar minha primeira reflexão");
    expect(page).toContain("Tudo pronto");
    expect(page).toContain("Ansiedade");
    expect(page).toContain("Perdão");
    expect(page).toContain("journeyAllowsChat");
    expect(page).not.toMatch(JARGON);
    expect(publicCopy(page)).not.toMatch(/\bentitlements\b/i);
    expect(page).not.toContain("acesso limitado");
    expect(page).not.toContain("Stripe");
    // Chat shortcuts only after allowsChat gate
    const readyIdx = page.indexOf("Começar minha primeira reflexão");
    const gateIdx = page.indexOf("allowsChat");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(readyIdx).toBeGreaterThan(-1);
  });

  it("personalizar avoids internal keys and uses guided copy", () => {
    const page = read("src", "app", "(platform)", "personalizar", "page.tsx");
    const form = read("src", "components", "auth", "onboarding-form.tsx");
    expect(page).toContain("Personalize sua experiência");
    expect(page).toContain(
      "Conte-nos como você prefere receber suas reflexões.",
    );
    expect(form).toContain("Salvar e começar");
    expect(form).toContain("ProgressSteps");
    expect(form).toContain("PERSONALIZATION_TRADITIONS");
    expect(form).toContain("PERSONALIZATION_STYLES");
    expect(form).toContain("PERSONALIZATION_DEPTHS");
    expect(form).not.toContain("<select");
    expect(form).not.toContain("Concluir onboarding");
    expect(form).not.toMatch(/>\s*ecumenical\s*</);
    expect(form).not.toMatch(/>\s*reflective\s*</);
    expect(form).not.toMatch(JARGON);
  });

  it("navigation remains state-driven with accessible mobile menu", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    const layout = read("src", "app", "(platform)", "layout.tsx");
    expect(layout).toContain("getPlatformNavItemsForState");
    expect(nav).toContain("aria-expanded");
    expect(nav).toContain("aria-controls");
    expect(nav).toContain("Abrir menu");
    expect(nav).toContain("Fechar menu");
    expect(nav).toContain("Escape");
    expect(nav).toContain("Sair");
    expect(nav).toContain("md:hidden");
    expect(getPlatformNavItemsForState("confirmed_without_plan").map((i) => i.label)).not.toContain(
      "Conversar",
    );
    expect(getPlatformNavItemsForState("active_ready").map((i) => i.label)).toEqual(
      expect.arrayContaining(["Início", "Conversar", "Conversas", "Conta"]),
    );
    expect(journeyAllowsChat("active_needs_personalization")).toBe(false);
    expect(journeyAllowsChat("active_ready")).toBe(true);
  });

  it("chat UI hides technical fields and supports composer loading a11y", () => {
    const chat = read("src", "components", "chat", "chat-panel.tsx");
    expect(chat).toContain("Preparando uma reflexão");
    expect(chat).toContain("Enter para enviar");
    expect(chat).toContain("prefers-reduced-motion");
    expect(chat).toContain("aria-live");
    expect(chat).toContain("Histórico");
    expect(chat).toContain("Experiência com inteligência artificial");
    expect(chat).not.toContain("groundingProvider");
    expect(chat).not.toContain("groundingCount");
    expect(chat).not.toMatch(/\bprovider\b/);
    expect(chat).not.toContain("Request ID");
    expect(chat).not.toContain("usage.label");
    expect(chat).not.toContain("meta.usage");
    expect(chat).not.toMatch(JARGON);
  });

  it("conversas has empty state and Nova reflexão without loading all messages", () => {
    const page = read("src", "app", "(platform)", "conversas", "page.tsx");
    expect(page).toContain("Nova reflexão");
    expect(page).toContain("EmptyState");
    expect(page).toContain("listForUser");
    expect(page).not.toContain("listRecent");
    expect(page).not.toMatch(JARGON);
  });

  it("conta is organized in Portuguese without inventing support", () => {
    const page = read("src", "app", "(platform)", "conta", "page.tsx");
    expect(page).toContain("Perfil");
    expect(page).toContain("Preferências");
    expect(page).toContain("Assinatura");
    expect(page).toContain("Segurança");
    expect(page).toContain("Alterar preferências");
    expect(page).toContain("Redefinir senha");
    expect(page).toContain("supportEmail");
    expect(page).toContain("brand.supportEmail");
    expect(page).not.toContain("Customer Portal");
    expect(page).not.toContain("suporte@");
    expect(page).not.toMatch(/["']onboarding["']/);
    expect(publicCopy(page)).not.toMatch(JARGON);
    expect(publicCopy(page)).not.toMatch(/\bentitlements\b/i);
    // Only render suporte section when configured
    expect(page).toContain("supportEmail ?");
    expect(traditionLabelPt("catholic")).toBe("Católica");
    expect(responseStyleLabelPt("practical")).toBe("Direto e prático");
    expect(preferredDepthLabelPt("brief")).toBe("Breve");
  });

  it("cancel and reactivate controls remain present", () => {
    const panel = read(
      "src",
      "components",
      "account",
      "subscription-management-panel.tsx",
    );
    expect(panel).toContain("Cancelar renovação");
    expect(panel).toContain("Manter minha assinatura");
    expect(panel).toContain("aria-modal");
    expect(panel).toContain("Escape");
    expect(panel).toContain("cancelTriggerRef");
    expect(panel).not.toContain("Customer Portal");
  });

  it("shared platform components exist without over-abstraction names leaking jargon", () => {
    const files = [
      "page-header.tsx",
      "section.tsx",
      "primary-action-card.tsx",
      "status-card.tsx",
      "empty-state.tsx",
      "progress-steps.tsx",
      "plan-status-badge.tsx",
      "skeleton.tsx",
      "inline-notice.tsx",
    ];
    for (const file of files) {
      const src = read("src", "components", "platform", file);
      expect(src.length).toBeGreaterThan(40);
      expect(src).not.toMatch(JARGON);
    }
    const loading = read("src", "app", "(platform)", "loading.tsx");
    expect(loading).toContain("PlatformSkeleton");
  });

  it("does not invent support email when unset", () => {
    // brand.supportEmail reflects env; never assert a fabricated address in UI source.
    expect(brand.supportEmail === null || brand.supportEmail.includes("@")).toBe(
      true,
    );
    const page = read("src", "app", "(platform)", "conta", "page.tsx");
    expect(page).not.toMatch(/suporte@amemchat/i);
  });

  it("paywall journey helpers are unchanged by polish", () => {
    expect(journeyAllowsChat("confirmed_without_plan")).toBe(false);
    expect(journeyAllowsChat("payment_pending")).toBe(false);
    expect(journeyAllowsChat("active_needs_personalization")).toBe(false);
    expect(journeyAllowsChat("active_ready")).toBe(true);
    expect(journeyAllowsChat("canceling_at_period_end")).toBe(true);
    expect(journeyAllowsChat("past_due")).toBe(false);
  });
});
