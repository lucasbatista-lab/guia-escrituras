import type { EntitlementKey } from "./types";

/**
 * Entitlements wired in product code today (gates chat, billing, or marketing truth).
 * Do not present RESERVED_ENTITLEMENT_KEYS as purchasable benefits.
 */
export const ACTIVE_ENTITLEMENT_KEYS = new Set<EntitlementKey>([
  "chat_standard",
  "chat_deep",
]);

/**
 * Catalog / roadmap flags — not enforced in runtime yet.
 * Kept on plan definitions for future use; never sold as active benefits.
 */
export const RESERVED_ENTITLEMENT_KEYS = new Set<EntitlementKey>([
  "chat_frequent",
  "short_memory",
  "extended_memory",
  "multiple_personas",
  "reading_journeys",
  "voice_responses",
  "priority_support",
  "human_concierge",
  "custom_content",
  "whatsapp_access",
  "fair_use_extended",
]);

export function isActiveEntitlementKey(key: EntitlementKey): boolean {
  return ACTIVE_ENTITLEMENT_KEYS.has(key);
}

export function isReservedEntitlementKey(key: EntitlementKey): boolean {
  return RESERVED_ENTITLEMENT_KEYS.has(key);
}

/** Max purchasable benefits shown on plan cards (active only). */
export const MAX_PUBLIC_PLAN_BENEFITS = 5;

/** Shared copy — Aprofundar (Profundo on-demand). */
export const DEEPEN_FEATURE_SUMMARY =
  "Aprofundar pede uma análise mais extensa da situação, com mais contexto, conexões bíblicas e próximos passos para reflexão — acionado por você, quando quiser.";

export const DEEPEN_FEATURE_DISCLAIMERS = [
  "Disponível no plano Profundo (e no Particular quando provisionado).",
  "Não é revelação, profecia ou orientação profissional.",
  "As respostas normais continuam acolhedoras e baseadas nas Escrituras — Aprofundar é uma ferramenta de extensão, não de superioridade espiritual.",
] as const;

/** Usage profile examples for /planos comparison (no internal budgets). */
export const PLAN_USAGE_PROFILES: Record<
  "essencial" | "caminho" | "profundo",
  { headline: string; example: string }
> = {
  essencial: {
    headline: "Uso pontual",
    example: "Quero conversar quando uma situação específica surgir.",
  },
  caminho: {
    headline: "Uso frequente",
    example: "Quero voltar várias vezes ao longo da semana.",
  },
  profundo: {
    headline: "Uso intenso + Aprofundar",
    example:
      "Quero usar com frequência e aprofundar temas importantes quando precisar.",
  },
};

/** Benefits included in every paid plan — honest shared baseline. */
export const SHARED_PLAN_INCLUDES = [
  "Reflexões cristãs personalizadas com orientação bíblica",
  "Tradição ecumênica, evangélica ou católica no perfil",
  "Profundidade de estilo escolhida no perfil",
  "Continuidade dentro da conversa e histórico privado",
  "Uso flexível dentro da política de uso justo",
  "Cancelamento da renovação pela sua conta",
] as const;

/** Roadmap items — never mixed into purchasable benefits on cards. */
export const PLAN_ROADMAP_ITEMS = [
  "Jornadas de leitura guiadas",
  "Perspectivas bíblicas adicionais",
  "Memória ampliada entre sessões",
  "Recursos em áudio",
  "Concierge, WhatsApp e recursos avançados (Particular, após alinhamento)",
] as const;
