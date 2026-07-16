export type EntitlementKey =
  | "chat_standard"
  | "chat_frequent"
  | "chat_deep"
  | "short_memory"
  | "extended_memory"
  | "multiple_personas"
  | "reading_journeys"
  | "voice_responses"
  | "priority_support"
  | "human_concierge"
  | "custom_content"
  | "whatsapp_access"
  | "fair_use_extended";

export type PlanKey = "essencial" | "caminho" | "profundo" | "particular";

export type PlanCtaType = "checkout" | "request_access";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  tagline: string;
  priceMonthlyCents: number;
  currency: "BRL";
  ctaType: PlanCtaType;
  ctaLabel: string;
  highlighted?: boolean;
  entitlements: EntitlementKey[];
  /** Benefits available and billed as part of the active promise. */
  displayBenefits: string[];
  /** Honest roadmap items — never sold as available now. */
  upcomingBenefits?: string[];
}

export const ENTITLEMENT_LABELS: Record<EntitlementKey, string> = {
  chat_standard: "Conversas com orientação bíblica",
  chat_frequent: "Uso frequente ao longo do mês",
  chat_deep: "Resposta aprofundada sob demanda",
  short_memory: "Memória curta da conversa",
  extended_memory: "Memória estendida entre sessões",
  multiple_personas: "Múltiplas perspectivas mentoras",
  reading_journeys: "Jornadas de leitura guiadas",
  voice_responses: "Respostas em áudio",
  priority_support: "Suporte prioritário",
  human_concierge: "Concierge humano",
  custom_content: "Conteúdo personalizado",
  whatsapp_access: "Acesso via WhatsApp",
  fair_use_extended: "Franquia flexível ampliada",
};
