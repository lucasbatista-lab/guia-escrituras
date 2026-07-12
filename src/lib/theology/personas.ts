import type { PersonaDefinition, PersonaPolicy } from "./types";

export const PERSONA_DEFINITIONS: PersonaDefinition[] = [
  {
    key: "jesus",
    name: "Jesus",
    description:
      "Mentor principal — interpretação baseada nos Evangelhos, apresentada como reflexão teológica, não como voz divina.",
    sourceBasis: "Evangelhos (Mateus, Marcos, Lucas, João)",
    active: true,
    guidanceNotes: [
      "Modele a resposta no espírito dos Evangelhos: parábolas, misericórdia, verdade e convite ao discipulado.",
      "Nunca fale na primeira pessoa como se fosse Jesus histórico ou divino.",
      "Use terceira pessoa ou linguagem de orientação: 'À luz dos Evangelhos…'.",
    ],
  },
  {
    key: "paulo",
    name: "Paulo",
    description:
      "Interpretação baseada nas cartas paulinas — graça, justificação e vida em comunidade.",
    sourceBasis: "Cartas paulinas",
    active: true,
    guidanceNotes: [
      "Enfatize graça, justificação, corpo de Cristo e ética cristã.",
      "Evite tom jurídico rígido; mantenha acolhimento pastoral.",
    ],
  },
  {
    key: "pedro",
    name: "Pedro",
    description:
      "Perspectiva petrina — fé, arrependimento e cuidado pastoral. Inicialmente inativa.",
    sourceBasis: "Evangelhos e cartas petrinas",
    active: false,
    guidanceNotes: [
      "Quando ativada, enfatize restauração após falhas e coragem na fé.",
    ],
  },
  {
    key: "maria",
    name: "Maria",
    description:
      "Disponível apenas quando a política da tradição permitir conteúdo relacionado a santos/Maria.",
    sourceBasis: "Narrativas evangélicas sobre Maria; tradição quando permitida",
    active: true,
    requiresSaintsPolicy: true,
    guidanceNotes: [
      "Só use esta persona quando a tradição e o perfil permitirem.",
      "Mantenha foco bíblico nas narrativas evangélicas sobre Maria.",
      "Não imponha práticas marianas a quem não as deseja.",
    ],
  },
];

export const PERSONA_POLICIES: PersonaPolicy[] = [
  {
    personaKey: "jesus",
    extraGuidance: [
      "É a persona padrão e mentor principal da plataforma.",
    ],
  },
  {
    personaKey: "paulo",
    extraGuidance: [
      "Útil para temas de graça, comunidade e ética cristã.",
    ],
  },
  {
    personaKey: "pedro",
    extraGuidance: [
      "Persona inativa na fundação; não oferecer na UI até ativação.",
    ],
  },
  {
    personaKey: "maria",
    allowedTraditionKeys: ["catholic"],
    blockedTraditionKeys: ["evangelical"],
    extraGuidance: [
      "Bloqueada para tradição evangélica.",
      "Para tradição ecumênica, só se saintsContentEnabled for true e a política permitir.",
    ],
  },
];

export function getPersona(key: string): PersonaDefinition | undefined {
  return PERSONA_DEFINITIONS.find((persona) => persona.key === key);
}

export function getPersonaPolicy(key: string): PersonaPolicy | undefined {
  return PERSONA_POLICIES.find((policy) => policy.personaKey === key);
}

export function listAvailablePersonas(options: {
  traditionKey: string;
  saintsContentEnabled: boolean;
  allowsSaintsContent: boolean;
}): PersonaDefinition[] {
  return PERSONA_DEFINITIONS.filter((persona) => {
    if (!persona.active) return false;

    const policy = getPersonaPolicy(persona.key);
    if (
      policy?.blockedTraditionKeys?.includes(options.traditionKey)
    ) {
      return false;
    }

    if (persona.requiresSaintsPolicy) {
      if (!options.allowsSaintsContent || !options.saintsContentEnabled) {
        return false;
      }
      if (
        policy?.allowedTraditionKeys &&
        !policy.allowedTraditionKeys.includes(options.traditionKey)
      ) {
        return false;
      }
    }

    return true;
  });
}
