import type { PlanDefinition } from "./types";

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "essencial",
    name: "Essencial",
    tagline: "Um ponto de partida acolhedor para reflexão diária.",
    priceMonthlyCents: 3800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Começar com Essencial",
    entitlements: ["chat_standard", "short_memory"],
    displayBenefits: [
      "Conversas com orientação baseada nas Escrituras",
      "Memória da conversa em andamento",
      "Uma tradição espiritual no perfil",
      "Uso flexível dentro do orçamento do plano",
    ],
  },
  {
    key: "caminho",
    name: "Caminho",
    tagline: "Para quem deseja acompanhar a jornada com mais regularidade.",
    priceMonthlyCents: 5800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Começar com Caminho",
    highlighted: true,
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "short_memory",
      "reading_journeys",
      "fair_use_extended",
    ],
    displayBenefits: [
      "Tudo do Essencial",
      "Uso mais frequente ao longo do mês",
      "Orçamento mensal ampliado para conversas",
      "Franquia flexível maior dentro do plano",
    ],
    upcomingBenefits: ["Jornadas de leitura guiadas"],
  },
  {
    key: "profundo",
    name: "Profundo",
    tagline: "Mais profundidade e margem nas conversas.",
    priceMonthlyCents: 18800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Começar com Profundo",
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "chat_deep",
      "short_memory",
      "extended_memory",
      "multiple_personas",
      "reading_journeys",
      "voice_responses",
      "priority_support",
      "fair_use_extended",
    ],
    displayBenefits: [
      "Tudo do Caminho",
      "Conversas profundas com maior contexto",
      "Orçamento mensal bem mais amplo",
      "Suporte prioritário",
    ],
    upcomingBenefits: [
      "Memória estendida entre sessões",
      "Múltiplas perspectivas mentoras",
      "Respostas em áudio",
      "Jornadas de leitura guiadas",
    ],
  },
  {
    key: "particular",
    name: "Particular",
    tagline: "Acompanhamento sob medida, com acesso sob solicitação.",
    priceMonthlyCents: 98800,
    currency: "BRL",
    ctaType: "request_access",
    ctaLabel: "Solicitar acesso",
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "chat_deep",
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
    ],
    displayBenefits: [
      "Acompanhamento sob medida, sob solicitação",
      "Conteúdo e orientação personalizados após alinhamento",
    ],
    upcomingBenefits: [
      "Concierge humano dedicado",
      "Acesso via WhatsApp",
      "Recursos avançados dos demais planos quando habilitados",
    ],
  },
];

export function getPlanByKey(key: PlanDefinition["key"]): PlanDefinition | undefined {
  return PLAN_DEFINITIONS.find((plan) => plan.key === key);
}

export function getPlanEntitlements(key: PlanDefinition["key"]) {
  return getPlanByKey(key)?.entitlements ?? [];
}

export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
