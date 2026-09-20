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
    wordRange: { min: 70, max: 180 },
    referenceCount: { min: 0, max: 2 },
    maxApplications: 2,
  },
  balanced: {
    wordRange: { min: 100, max: 260 },
    referenceCount: { min: 0, max: 3 },
    maxApplications: 3,
  },
  deep: {
    wordRange: { min: 400, max: 900 },
    referenceCount: { min: 1, max: 5 },
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
          "- brief: acolhimento curto; organize o ponto; finalize com um passo. Não alongue.",
        ]
      : depth === "deep"
        ? [
            "- deep: maior aprofundamento, nuances e aplicação cuidadosa, sem virar palestra nem sermão.",
          ]
        : [
            "- balanced: reflexão clara e humana; fique no menor tamanho que ainda seja útil — sem palestra.",
          ];

  const promptLines = [
    `## Formato e profundidade (${depth})`,
    `- Extensão visível aproximada: ${base.wordRange.min}–${base.wordRange.max} palavras (diretriz; prefira o menor tamanho suficiente).`,
    `- Referências bíblicas do contexto recuperado: use de 0 até ${base.referenceCount.max} quando ajudarem de verdade; não force citação em toda resposta.`,
    `- Ofereça no máximo ${base.maxApplications} sugestões práticas concretas (prefira uma boa).`,
    ...depthSpecific,
    "- Estruture com naturalidade: acolher → organizar o problema → reflexão bíblica se for útil → um passo prático. Pergunta só se faltar um dado essencial (no máximo uma).",
    "- Não inicie repetindo que é uma IA. A interface já mostra isso.",
    "- Evite tom de artigo genérico, sermão automático, interrogatório ou terapia clínica.",
    "- Não fale como pastor ordenado, terapeuta, Deus ou Jesus.",
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
