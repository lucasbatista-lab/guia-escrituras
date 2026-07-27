import type { PlanDefinition } from "./types";

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "essencial",
    name: "Essencial",
    idealFor: "Comece com clareza",
    tagline:
      "Para situações pontuais, com reflexão personalizada, referências bíblicas e continuidade pelo histórico.",
    priceMonthlyCents: 3800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Começar com o Essencial",
    entitlements: ["chat_standard", "short_memory"],
    displayBenefits: [
      "Reflexões cristãs personalizadas com orientação bíblica",
      "Tradição ecumênica, evangélica ou católica no perfil",
      "Continuidade dentro da conversa e histórico privado",
      "Para uso pontual, dentro da política de uso justo",
      "Cancelamento da renovação pela sua conta",
    ],
  },
  {
    key: "caminho",
    name: "Caminho",
    idealFor: "Constância com Jornadas",
    tagline:
      "Tudo do Essencial, com Jornadas guiadas de 7 etapas para quem quer voltar ao longo da semana.",
    priceMonthlyCents: 5800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Escolher o Caminho",
    highlighted: true,
    highlightBadge: "Melhor equilíbrio entre uso e acompanhamento",
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "short_memory",
      "reading_journeys",
      "fair_use_extended",
    ],
    displayBenefits: [
      "Tudo do Essencial",
      "Para quem volta várias vezes na semana",
      "Mais espaço para conversas no mês",
      "Jornadas de leitura guiadas sobre temas reais da vida",
      "Dentro da política de uso justo",
    ],
  },
  {
    key: "profundo",
    name: "Profundo",
    idealFor: "Quando a situação pede mais análise",
    tagline:
      "Tudo do Caminho, com Aprofundar sob demanda para explorar contexto, tensões e próximos passos.",
    priceMonthlyCents: 18800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Quero o Profundo",
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
      "Aprofundar sob demanda para análises adicionais",
      "Mais contexto, tensões e próximos passos quando você pedir",
      "Para uso mais intenso, dentro da política de uso justo",
      "Cancelamento da renovação pela sua conta",
    ],
    upcomingBenefits: [
      "Perspectivas bíblicas adicionais",
      "Memória ampliada entre sessões",
      "Recursos em áudio",
    ],
  },
  {
    key: "particular",
    name: "Particular",
    tagline: "Acompanhamento sob medida, com acesso sob solicitação.",
    idealFor: "Acompanhamento sob medida",
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
      "Acompanhamento sob medida, com alinhamento prévio",
      "Valor de referência sujeito a avaliação conjunta",
      "Resposta aprofundada sob demanda, quando provisionado",
    ],
    upcomingBenefits: [
      "Possibilidades avaliadas após alinhamento: concierge, WhatsApp de suporte/comercial (nunca pastoral) e recursos avançados",
    ],
  },
];

export function getPlanByKey(key: PlanDefinition["key"]): PlanDefinition | undefined {
  return PLAN_DEFINITIONS.find((plan) => plan.key === key);
}

export function getPlanEntitlements(key: PlanDefinition["key"]) {
  return getPlanByKey(key)?.entitlements ?? [];
}

/** Public self-serve plans shown in the main commercial grid. */
export function getPublicCheckoutPlans(): PlanDefinition[] {
  return PLAN_DEFINITIONS.filter((plan) => plan.ctaType === "checkout");
}

export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
