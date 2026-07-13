import type { PreferredDepth } from "@/lib/theology";

export type ChatResponseDepth = PreferredDepth;

export interface ResponseDepthGuidance {
  depth: ChatResponseDepth;
  /** Approximate visible answer length guidance (words). */
  wordRange: { min: number; max: number };
  referenceCount: { min: number; max: number };
  maxApplications: number;
  promptLines: string[];
}

const DEPTH_TABLE: Record<ChatResponseDepth, Omit<ResponseDepthGuidance, "depth" | "promptLines">> = {
  brief: {
    wordRange: { min: 150, max: 300 },
    referenceCount: { min: 1, max: 2 },
    maxApplications: 3,
  },
  balanced: {
    wordRange: { min: 350, max: 650 },
    referenceCount: { min: 2, max: 4 },
    maxApplications: 5,
  },
  deep: {
    wordRange: { min: 600, max: 1000 },
    referenceCount: { min: 3, max: 5 },
    maxApplications: 5,
  },
};

/**
 * Resolve depth for a chat turn.
 * preferDeep upgrades to deep for that request.
 */
export function resolveChatResponseDepth(input: {
  preferredDepth: PreferredDepth | string | null | undefined;
  preferDeep?: boolean;
}): ChatResponseDepth {
  if (input.preferDeep) return "deep";
  const raw = (input.preferredDepth ?? "balanced").toString().toLowerCase();
  if (raw === "brief" || raw === "balanced" || raw === "deep") return raw;
  return "balanced";
}

export function getResponseDepthGuidance(
  depth: ChatResponseDepth,
): ResponseDepthGuidance {
  const base = DEPTH_TABLE[depth];
  const promptLines = [
    `## Formato e profundidade (${depth})`,
    `- Extensão visível aproximada: ${base.wordRange.min}–${base.wordRange.max} palavras (diretriz, não contagem rígida).`,
    `- Use ${base.referenceCount.min}–${base.referenceCount.max} referências bíblicas do contexto recuperado.`,
    `- Ofereça no máximo ${base.maxApplications} passos práticos concretos.`,
    "- Estruture preferencialmente: (1) acolhimento curto; (2) reflexão à luz das passagens; (3) 2–5 passos para o momento; (4) uma única pergunta de continuidade.",
    "- Não inicie a resposta com disclaimer de identidade (“Sou uma experiência de inteligência artificial…”). Isso já aparece na interface.",
    "- Não repita o disclaimer várias vezes. interpretationNotice deve ser uma frase curta.",
    "- Não listar novamente todas as referências no final se já foram tecidas na reflexão.",
    "- Evite palestras, excesso de títulos, tom burocrático, oito ou mais recomendações e listas do que você “pode fazer”.",
    "- Nunca fale como se fosse literalmente Jesus; nunca alegue revelação sobrenatural.",
  ];

  return { depth, ...base, promptLines };
}

/** Grounding retrieval limit aligned with depth guidance. */
export function groundingLimitForDepth(depth: ChatResponseDepth): number {
  return getResponseDepthGuidance(depth).referenceCount.max;
}
