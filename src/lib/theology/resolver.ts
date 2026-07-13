import { GENERAL_THEOLOGY_RULES, IDENTITY_DISCLAIMER } from "./general-rules";
import { getPersona, getPersonaPolicy } from "./personas";
import { getTraditionPolicy } from "./traditions";
import type {
  SpiritualProfilePrefs,
  TheologyPolicy,
  TraditionKey,
} from "./types";

export interface TheologyPolicyResolverInput {
  traditionKey: TraditionKey;
  personaKey: string;
  userPrefs: Pick<
    SpiritualProfilePrefs,
    | "responseStyle"
    | "preferredDepth"
    | "saintsContentEnabled"
    | "preferredBibleTranslation"
    | "denomination"
  >;
}

export class TheologyPolicyResolver {
  resolve(input: TheologyPolicyResolverInput): TheologyPolicy {
    const tradition =
      getTraditionPolicy(input.traditionKey) ??
      getTraditionPolicy("ecumenical")!;
    const persona = getPersona(input.personaKey) ?? getPersona("jesus")!;
    const personaPolicy = getPersonaPolicy(persona.key);

    const allowsSaintsContent =
      tradition.allowsSaintsContent && input.userPrefs.saintsContentEnabled;

    const traditionRules = [...tradition.guidanceNotes];
    if (!allowsSaintsContent) {
      traditionRules.push(
        "Não apresente devoção a santos, intercessão de santos ou práticas marianas.",
      );
    }

    const personaRules = [
      ...persona.guidanceNotes,
      ...(personaPolicy?.extraGuidance ?? []),
    ];

    const userPreferenceRules = [
      `Estilo de resposta preferido: ${input.userPrefs.responseStyle}.`,
      `Profundidade preferida: ${input.userPrefs.preferredDepth}.`,
    ];

    if (input.userPrefs.preferredBibleTranslation) {
      userPreferenceRules.push(
        `Preferência de tradução bíblica: ${input.userPrefs.preferredBibleTranslation} (use apenas se houver fonte licenciada; caso contrário, cite referência sem texto completo).`,
      );
    }

    if (input.userPrefs.denomination) {
      userPreferenceRules.push(
        `Denominação informada pelo usuário: ${input.userPrefs.denomination}. Respeite essa identidade sem assumir uniformidade.`,
      );
    }

    // Identity disclaimer is kept for policy consumers / UI, but the model is
    // instructed not to recite it at the start of every answer.
    const composedSystemPromptSections = [
      "## Identidade (não repetir no início de cada resposta)",
      "A interface já informa que esta é uma experiência de IA baseada nas Escrituras. Não comece respostas com essa apresentação.",
      "Nunca afirme ser Jesus, Deus ou revelação sobrenatural.",
      "## Regras gerais",
      ...GENERAL_THEOLOGY_RULES.map((rule) => `- ${rule}`),
      `## Tradição: ${tradition.label}`,
      ...traditionRules.map((rule) => `- ${rule}`),
      `## Persona: ${persona.name}`,
      `- Base: ${persona.sourceBasis}`,
      ...personaRules.map((rule) => `- ${rule}`),
      "## Preferências do usuário",
      ...userPreferenceRules.map((rule) => `- ${rule}`),
    ];

    return {
      identityDisclaimer: IDENTITY_DISCLAIMER,
      generalRules: GENERAL_THEOLOGY_RULES,
      traditionRules,
      personaRules,
      userPreferenceRules,
      composedSystemPromptSections,
      allowsSaintsContent,
      traditionKey: tradition.key,
      personaKey: persona.key,
    };
  }
}

export const theologyPolicyResolver = new TheologyPolicyResolver();
