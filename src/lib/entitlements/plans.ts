import type { PlanDefinition } from "./types";

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "essencial",
    name: "Essencial",
    tagline:
      "Para quem quer levar situações reais ao Amém Chat com regularidade moderada.",
    priceMonthlyCents: 3800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Começar com Essencial",
    entitlements: ["chat_standard", "short_memory"],
    displayBenefits: [
      "Reflexões personalizadas com orientação bíblica",
      "Tradição ecumênica, evangélica ou católica no perfil",
      "Profundidade escolhida no seu perfil",
      "Memória dentro da conversa em andamento",
      "Histórico de conversas",
      "Margem mensal para conversas pontuais e próximos passos",
      "Uso flexível dentro da política de uso justo",
      "Cancelamento da renovação pela sua conta",
    ],
  },
  {
    key: "caminho",
    name: "Caminho",
    tagline:
      "Para quem quer voltar ao Amém Chat várias vezes por semana e ter mais margem para acompanhar situações ao longo do mês.",
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
      "Maior margem de uso mensal",
      "Limite diário ampliado",
      "Continuidade para uso frequente",
    ],
    upcomingBenefits: ["Jornadas de leitura guiadas"],
  },
  {
    key: "profundo",
    name: "Profundo",
    tagline:
      "Para quem pretende usar o Amém Chat de forma intensa e quer a maior margem mensal disponível nos planos automáticos.",
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
      "Maior margem de uso mensal",
      "Maior tolerância para uso frequente ao longo do dia",
      "Histórico, memória e personalização já existentes",
    ],
    upcomingBenefits: [
      "Resposta aprofundada sob demanda",
      "Perspectivas bíblicas adicionais",
      "Memória ampliada entre sessões",
      "Recursos em áudio",
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
      "Acompanhamento sob medida, com alinhamento prévio",
      "Valor de referência sujeito a avaliação conjunta",
    ],
    upcomingBenefits: [
      "Possibilidades avaliadas após alinhamento: concierge, WhatsApp e recursos avançados",
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
