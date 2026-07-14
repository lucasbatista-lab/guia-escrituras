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

const DEPTH_TABLE: Record<
  ChatResponseDepth,
  Omit<ResponseDepthGuidance, "depth" | "promptLines">
> = {
  brief: {
    wordRange: { min: 150, max: 300 },
    referenceCount: { min: 1, max: 2 },
    maxApplications: 3,
  },
  balanced: {
    wordRange: { min: 300, max: 600 },
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
  const depthSpecific =
    depth === "brief"
      ? [
          "- brief: acolhimento curto; reflexão enxuta; finalize sem alongar.",
        ]
      : depth === "deep"
        ? [
            "- deep: maior aprofundamento, nuances e aplicação cuidadosa, sem virar palestra.",
          ]
        : [
            "- balanced: reflexão clara e humana, com passos práticos sem excesso.",
          ];

  const promptLines = [
    `## Formato e profundidade (${depth})`,
    `- Extensão visível aproximada: ${base.wordRange.min}–${base.wordRange.max} palavras (diretriz, não contagem rígida).`,
    `- Use ${base.referenceCount.min}–${base.referenceCount.max} referências bíblicas do contexto recuperado.`,
    `- Ofereça no máximo ${base.maxApplications} sugestões práticas concretas.`,
    ...depthSpecific,
    "- Estruture com naturalidade: acolhimento → reflexão à luz das passagens → poucos passos → no máximo uma pergunta de continuidade.",
    "- Não inicie repetindo que é uma IA. A interface já mostra isso.",
    "- interpretationNotice: frase curta e obrigatória sobre referência/síntese (não um essay).",
    "- Não apresente paráfrase como citação literal; não invente versículo.",
    "- Nunca diga “Jesus está dizendo a você”; nunca alegue revelação sobrenatural; nunca fale como se fosse literalmente Jesus.",
    "- Linguagem humana, acolhedora e brasileira. Evite palestra, burocracia e listas excessivas.",
    "- Não listar novamente todas as referências no final se já foram tecidas na reflexão.",
  ];

  return { depth, ...base, promptLines };
}

/** Grounding retrieval limit aligned with depth guidance. */
export function groundingLimitForDepth(depth: ChatResponseDepth): number {
  return getResponseDepthGuidance(depth).referenceCount.max;
}
